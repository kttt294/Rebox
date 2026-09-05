import type {
  KycStatus,
  KycStatusResponse,
  SubmitKycBankInput,
  SubmitKycDocumentInput,
  SubmitKycTaxInput
} from "@rebox/shared";
import type { Pool } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";
import { createPiiKey, decryptPii, encryptPii } from "../identity/pii";
import type { CatalogImageObject, CatalogMediaStorage } from "../inventory/catalog-media-storage";
import type { BusinessVerificationProvider, KycImage, KycProvider } from "./kyc-provider";

type KycRow = {
  id: string;
  user_id: string;
  shop_id: string;
  citizen_id_enc: Buffer | null;
  full_name_enc: Buffer | null;
  dob_enc: Buffer | null;
  gender_enc: Buffer | null;
  address_enc: Buffer | null;
  issued_at_enc: Buffer | null;
  front_ref: string | null;
  back_ref: string | null;
  selfie_ref: string | null;
  front_valid: boolean | null;
  back_valid: boolean | null;
  face_matched: boolean | null;
  face_match_score: number | null;
  liveness_passed: boolean | null;
  liveness_score: number | null;
  status: KycStatus;
};

type EvaluationRow = KycRow & {
  tax_status: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null;
  taxpayer_name_enc: Buffer | null;
  bank_status: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null;
  name_match_score: number | null;
};

export class KycModule {
  private readonly piiKey: Buffer;

  constructor(
    private readonly pool: Pool,
    piiSecret: string,
    private readonly storage: CatalogMediaStorage,
    private readonly provider: KycProvider,
    private readonly businessVerification: BusinessVerificationProvider
  ) {
    this.piiKey = createPiiKey(piiSecret);
  }

  async start(actorId: string, shopId: string): Promise<KycStatusResponse & { id: string }> {
    const owned = await this.pool.query(
      `SELECT 1 FROM shop_memberships
       WHERE user_id = $1 AND shop_id = $2 AND role = 'OWNER' AND status = 'ACTIVE'`,
      [actorId, shopId]
    );
    if (!owned.rowCount) throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shop not found");

    const id = `RBXKYC-${ulid()}`;
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO seller_kyc (id, shop_id, user_id, provider, status)
       VALUES ($1, $2, $3, $4, 'PROCESSING')
       ON CONFLICT (shop_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [id, shopId, actorId, this.provider.name]
    );
    await this.pool.query("UPDATE shops SET kyc_status = 'PROCESSING' WHERE id = $1 AND kyc_status = 'PENDING'", [shopId]);
    const kycId = result.rows[0]!.id;
    return { id: kycId, ...(await this.getStatus(actorId, kycId)) };
  }

  async submitDocument(
    actorId: string,
    side: "front" | "back",
    input: SubmitKycDocumentInput
  ): Promise<KycStatusResponse> {
    const row = await this.requireOwnedKyc(actorId, input.kycId);
    this.requireMutable(row);
    const otherRef = side === "front" ? row.back_ref : row.front_ref;
    if (input.objectKey === otherRef) {
      throw new DomainError("VALIDATION_FAILED", 422, "CCCD front and back must use different images");
    }
    const expectedFolder = `seller-onboarding/${actorId}/cccd/`;
    const image = await this.readImage(input.objectKey, expectedFolder);
    const result = await this.callProvider(() => this.provider.analyzeDocument(side, image));
    const refColumn = side === "front" ? "front_ref" : "back_ref";
    const validColumn = side === "front" ? "front_valid" : "back_valid";
    const identity = result.identity;
    await this.pool.query(
      `UPDATE seller_kyc SET
         ${refColumn} = $2, ${validColumn} = $3,
         citizen_id_enc = COALESCE($4, citizen_id_enc),
         full_name_enc = COALESCE($5, full_name_enc),
         dob_enc = COALESCE($6, dob_enc), gender_enc = COALESCE($7, gender_enc),
         address_enc = COALESCE($8, address_enc), issued_at_enc = COALESCE($9, issued_at_enc),
         provider_reference = COALESCE($10, provider_reference), updated_at = now()
       WHERE id = $1`,
      [
        input.kycId,
        input.objectKey,
        result.documentValid,
        this.encryptOptional(identity.citizenId),
        this.encryptOptional(identity.fullName),
        this.encryptOptional(identity.dateOfBirth),
        this.encryptOptional(identity.gender),
        this.encryptOptional(identity.address),
        this.encryptOptional(identity.issuedAt),
        result.reference ?? null
      ]
    );
    await this.refreshStatus(input.kycId);
    return this.getStatus(actorId, input.kycId);
  }

  async submitSelfie(actorId: string, input: SubmitKycDocumentInput): Promise<KycStatusResponse> {
    const row = await this.requireOwnedKyc(actorId, input.kycId);
    this.requireMutable(row);
    if (!row.front_ref || !row.back_ref || row.front_valid !== true || row.back_valid !== true) {
      throw new DomainError("INVALID_KYC_STATE", 409, "Both valid CCCD sides are required before selfie verification");
    }
    const [document, selfie] = await Promise.all([
      this.readImage(row.front_ref, `seller-onboarding/${actorId}/cccd/`),
      this.readImage(input.objectKey, `seller-onboarding/${actorId}/selfie/`)
    ]);
    const [face, liveness] = await Promise.all([
      this.callProvider(() => this.provider.compareFace(document, selfie)),
      this.callProvider(() => this.provider.checkLiveness(selfie))
    ]);
    await this.pool.query(
      `UPDATE seller_kyc SET selfie_ref = $2, face_matched = $3, face_match_score = $4,
         liveness_passed = $5, liveness_score = $6,
         provider_reference = COALESCE($7, $8, provider_reference), updated_at = now()
       WHERE id = $1`,
      [input.kycId, input.objectKey, face.matched, face.score, liveness.passed, liveness.score,
        face.reference ?? null, liveness.reference ?? null]
    );
    await this.refreshStatus(input.kycId);
    return this.getStatus(actorId, input.kycId);
  }

  async submitTax(actorId: string, input: SubmitKycTaxInput): Promise<KycStatusResponse> {
    const row = await this.requireOwnedKyc(actorId, input.kycId);
    this.requireMutable(row);
    const result = await this.businessVerification.verifyTax(input.taxCode);
    await this.pool.query(
      `INSERT INTO seller_tax_info (kyc_id, user_id, tax_code_enc, taxpayer_name_enc, verification_status, verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (kyc_id) DO UPDATE SET tax_code_enc = EXCLUDED.tax_code_enc,
         taxpayer_name_enc = EXCLUDED.taxpayer_name_enc, verification_status = EXCLUDED.verification_status,
         verified = EXCLUDED.verified, created_at = now()`,
      [input.kycId, actorId, encryptPii(input.taxCode, this.piiKey), this.encryptOptional(result.registeredName),
        result.status, result.status === "VERIFIED"]
    );
    await this.refreshStatus(input.kycId);
    return this.getStatus(actorId, input.kycId);
  }

  async submitBank(actorId: string, input: SubmitKycBankInput): Promise<KycStatusResponse> {
    const row = await this.requireOwnedKyc(actorId, input.kycId);
    this.requireMutable(row);
    const result = await this.businessVerification.verifyBank(input.bankCode, input.accountNumber);
    const identityName = decryptPii(row.full_name_enc, this.piiKey);
    const nameScore = identityName && result.registeredName
      ? Number(normalizePersonName(identityName) === normalizePersonName(result.registeredName))
      : null;
    await this.pool.query(
      `INSERT INTO seller_bank_accounts (
         kyc_id, user_id, bank_code, account_number_enc, account_holder_name_enc,
         name_match_score, verification_status, verified
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (kyc_id) DO UPDATE SET bank_code = EXCLUDED.bank_code,
         account_number_enc = EXCLUDED.account_number_enc,
         account_holder_name_enc = EXCLUDED.account_holder_name_enc,
         name_match_score = EXCLUDED.name_match_score,
         verification_status = EXCLUDED.verification_status,
         verified = EXCLUDED.verified, created_at = now()`,
      [input.kycId, actorId, input.bankCode, encryptPii(input.accountNumber, this.piiKey),
        this.encryptOptional(result.registeredName), nameScore, result.status,
        result.status === "VERIFIED" && nameScore === 1]
    );
    await this.refreshStatus(input.kycId);
    return this.getStatus(actorId, input.kycId);
  }

  async getStatus(actorId: string, kycId: string): Promise<KycStatusResponse> {
    const row = await this.requireOwnedKyc(actorId, kycId);
    return {
      success: true,
      kycStatus: row.status,
      identity: {
        citizenId: decryptPii(row.citizen_id_enc, this.piiKey),
        fullName: decryptPii(row.full_name_enc, this.piiKey),
        dateOfBirth: decryptPii(row.dob_enc, this.piiKey),
        gender: decryptPii(row.gender_enc, this.piiKey),
        address: decryptPii(row.address_enc, this.piiKey),
        issuedAt: decryptPii(row.issued_at_enc, this.piiKey)
      },
      verification: {
        documentValid: row.front_valid === null || row.back_valid === null
          ? null
          : row.front_valid && row.back_valid,
        faceMatched: row.face_matched,
        faceScore: row.face_match_score,
        livenessPassed: row.liveness_passed,
        livenessScore: row.liveness_score
      }
    };
  }

  private async refreshStatus(kycId: string): Promise<void> {
    const result = await this.pool.query<EvaluationRow>(
      `SELECT k.*, t.verification_status AS tax_status, t.taxpayer_name_enc,
              b.verification_status AS bank_status, b.name_match_score
       FROM seller_kyc k
       LEFT JOIN seller_tax_info t ON t.kyc_id = k.id
       LEFT JOIN seller_bank_accounts b ON b.kyc_id = k.id
       WHERE k.id = $1`,
      [kycId]
    );
    const row = result.rows[0]!;
    const status = this.evaluate(row);
    await this.pool.query(
      `UPDATE seller_kyc SET status = $2,
         verified_at = CASE WHEN $2 = 'VERIFIED' THEN COALESCE(verified_at, now()) ELSE NULL END,
         updated_at = now() WHERE id = $1`,
      [kycId, status]
    );
    await this.pool.query(
      `UPDATE shops SET kyc_status = $2,
         kyc_verified_at = CASE WHEN $2 = 'VERIFIED' THEN COALESCE(kyc_verified_at, now()) ELSE NULL END
       WHERE id = $1`,
      [row.shop_id, status]
    );
    if (status === "VERIFIED" || status === "REJECTED") await this.deleteSourceImages(row);
  }

  private evaluate(row: EvaluationRow): KycStatus {
    const identityName = decryptPii(row.full_name_enc, this.piiKey);
    const taxpayerName = decryptPii(row.taxpayer_name_enc, this.piiKey);
    // ponytail: exact normalized matching is conservative; add an audited fuzzy matcher only with real false-reject data.
    return evaluateKycStatus({
      frontValid: row.front_valid,
      backValid: row.back_valid,
      faceMatched: row.face_matched,
      livenessPassed: row.liveness_passed,
      taxStatus: row.tax_status,
      bankStatus: row.bank_status,
      taxNameMatched: Boolean(identityName && taxpayerName
        && normalizePersonName(identityName) === normalizePersonName(taxpayerName)),
      bankNameMatched: row.name_match_score === 1
    });
  }

  private async requireOwnedKyc(actorId: string, kycId: string): Promise<KycRow> {
    const result = await this.pool.query<KycRow>(
      `SELECT k.* FROM seller_kyc k
       JOIN shop_memberships m ON m.shop_id = k.shop_id
       WHERE k.id = $1 AND k.user_id = $2 AND m.user_id = $2 AND m.role = 'OWNER' AND m.status = 'ACTIVE'`,
      [kycId, actorId]
    );
    if (!result.rows[0]) throw new DomainError("RESOURCE_NOT_FOUND", 404, "KYC request not found");
    return result.rows[0];
  }

  private requireMutable(row: KycRow): void {
    if (row.status === "VERIFIED" || row.status === "REJECTED") {
      throw new DomainError("INVALID_KYC_STATE", 409, `KYC request is already ${row.status.toLowerCase()}`);
    }
  }

  private async readImage(key: string, expectedPrefix: string): Promise<KycImage> {
    if (!key.startsWith(expectedPrefix)) throw new DomainError("RESOURCE_NOT_FOUND", 404, "KYC image not found");
    const metadata = await this.storage.inspectObject(key);
    requireKycImage(metadata);
    return { bytes: await this.storage.readObject(key), mimeType: metadata!.mimeType };
  }

  private encryptOptional(value: string | undefined): Buffer | null {
    return value ? encryptPii(value, this.piiKey) : null;
  }

  private async callProvider<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch {
      throw new DomainError("KYC_PROVIDER_UNAVAILABLE", 503, "KYC provider is temporarily unavailable");
    }
  }

  private async deleteSourceImages(row: KycRow): Promise<void> {
    const keys = [row.front_ref, row.back_ref, row.selfie_ref].filter((key): key is string => Boolean(key));
    await Promise.allSettled(keys.map((key) => this.storage.deleteObject(key)));
  }
}

export function normalizePersonName(value: string): string {
  return value.normalize("NFD").replace(/[Đđ]/g, "D").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function evaluateKycStatus(input: {
  frontValid: boolean | null;
  backValid: boolean | null;
  faceMatched: boolean | null;
  livenessPassed: boolean | null;
  taxStatus: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null;
  bankStatus: "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | null;
  taxNameMatched: boolean;
  bankNameMatched: boolean;
}): KycStatus {
  if (input.frontValid === false || input.backValid === false || input.faceMatched === false
    || input.livenessPassed === false || input.taxStatus === "NOT_FOUND" || input.bankStatus === "NOT_FOUND") {
    return "REJECTED";
  }
  if (input.frontValid !== true || input.backValid !== true || input.faceMatched !== true
    || input.livenessPassed !== true || !input.taxStatus || !input.bankStatus) return "PROCESSING";
  if (input.taxStatus === "UNAVAILABLE" || input.bankStatus === "UNAVAILABLE"
    || !input.taxNameMatched || !input.bankNameMatched) return "MANUAL_REVIEW";
  return "VERIFIED";
}

function requireKycImage(image: CatalogImageObject | null): asserts image is CatalogImageObject {
  if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)
    || image.sizeBytes <= 0 || image.sizeBytes > 5 * 1024 * 1024
    || image.width <= 0 || image.height <= 0 || !/^[a-f0-9]{64}$/.test(image.sha256)) {
    throw new DomainError("VALIDATION_FAILED", 422, "KYC image must be a readable JPEG, PNG or WebP up to 5 MiB");
  }
}
