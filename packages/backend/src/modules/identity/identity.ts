import type {
  ActorContext,
  CatalogImageUploadIntent,
  CreateSellerDocumentUploadInput,
  CreateShopInput,
  ShopCapability,
  ShopRole
} from "@rebox/shared";
import type { Pool, PoolClient } from "pg";
import { ulid } from "ulid";
import { DomainError } from "../../errors";
import type { CatalogImageObject, CatalogMediaStorage } from "../inventory/catalog-media-storage";
import { createPiiKey, encryptPii } from "./pii";

export type ShopAccess = {
  shopId: string;
  displayName: string;
  role: ShopRole;
  kycStatus: "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED" | "MANUAL_REVIEW";
  shopStatus: "ONBOARDING" | "ACTIVE" | "PAUSED" | "LOCKED_INSUFFICIENT_FUND" | "SUSPENDED";
};

const capabilityRoles: Record<ShopCapability, ReadonlySet<ShopRole>> = {
  CREATE_LISTING: new Set(["OWNER", "MANAGER", "WAREHOUSE"]),
  PUBLISH_LISTING: new Set(["OWNER", "MANAGER"])
};

type MembershipRow = {
  shop_id: string;
  display_name: string;
  role: ShopRole;
  membership_status: string;
  kyc_status: ShopAccess["kycStatus"];
  shop_status: ShopAccess["shopStatus"];
};

export class IdentityModule {
  private readonly piiEncryptionKey: Buffer;

  constructor(
    private readonly pool: Pool,
    piiEncryptionSecret: string,
    private readonly avatarStorage: CatalogMediaStorage,
    private readonly kycStorage: CatalogMediaStorage
  ) {
    this.piiEncryptionKey = createPiiKey(piiEncryptionSecret);
  }

  async createSellerDocumentUploadIntent(
    actorId: string,
    input: CreateSellerDocumentUploadInput
  ): Promise<CatalogImageUploadIntent> {
    const client = await this.pool.connect();
    try {
      await this.requireEligibleActor(client, actorId);
    } finally {
      client.release();
    }

    const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType.slice("image/".length);
    const folder = input.kind === "AVATAR" ? "avatar" : input.kind === "SELFIE" ? "selfie" : "cccd";
    const key = `seller-onboarding/${actorId}/${folder}/${ulid()}.${extension}`;
    const storage = input.kind === "AVATAR" ? this.avatarStorage : this.kycStorage;
    return storage.createUploadIntent({ key, mimeType: input.mimeType, sizeBytes: input.sizeBytes });
  }

  async onboardShop(actorId: string, input: CreateShopInput): Promise<ShopAccess> {
    const documents = await this.inspectSellerDocuments(actorId, input);
    const client = await this.pool.connect();
    const shopId = `RBX-${ulid()}`;

    try {
      await client.query("BEGIN");
      await this.requireEligibleActor(client, actorId);
      await client.query(
        `INSERT INTO shops (id, display_name, legal_type, kyc_status, status)
         VALUES ($1, $2, $3, 'PENDING', 'ONBOARDING')`,
        [shopId, input.displayName, input.legalType]
      );
      await client.query(
        `INSERT INTO shop_memberships (user_id, shop_id, role, status)
         VALUES ($1, $2, 'OWNER', 'ACTIVE')`,
        [actorId, shopId]
      );
      await client.query(
        `INSERT INTO shop_onboarding_profiles (
           shop_id, description, avatar_ref, phone_enc, pickup_contact_enc, pickup_address_enc,
           pickup_province, pickup_district, pickup_ward, kyc_mode, kyc_front_ref,
           kyc_back_ref, kyc_front_sha256, kyc_back_sha256, tax_code_enc,
           payout_bank_code, payout_account_enc, payout_holder_enc, carrier_codes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL', $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          shopId,
          input.description,
          input.documents.avatarKey,
          this.encrypt(input.phone),
          this.encrypt(input.pickupAddress.contactName),
          this.encrypt(input.pickupAddress.addressLine),
          input.pickupAddress.province,
          input.pickupAddress.district,
          input.pickupAddress.ward,
          input.documents.cccdFrontKey,
          input.documents.cccdBackKey,
          documents.cccdFront.sha256,
          documents.cccdBack.sha256,
          this.encrypt(input.kyc.taxCode),
          input.kyc.bankCode,
          this.encrypt(input.kyc.bankAccount),
          this.encrypt(input.kyc.accountHolder),
          JSON.stringify(input.carrierCodes)
        ]
      );
      await client.query("COMMIT");
      return {
        shopId,
        displayName: input.displayName,
        role: "OWNER",
        kycStatus: "PENDING",
        shopStatus: "ONBOARDING"
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error, "shops_display_name_unique")) {
        throw new DomainError("SHOP_NAME_TAKEN", 409, "Shop display name is already in use");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async requireEligibleActor(client: PoolClient, actorId: string): Promise<void> {
    const authUser = await client.query<{ email_confirmed_at: Date | null }>(
      "SELECT email_confirmed_at FROM auth.users WHERE id = $1",
      [actorId]
    );
    if (!authUser.rows[0]?.email_confirmed_at) {
      throw new DomainError("EMAIL_NOT_VERIFIED", 409, "Email must be verified before seller onboarding");
    }
    await client.query(
      `INSERT INTO profiles (id, status) VALUES ($1, 'ACTIVE') ON CONFLICT (id) DO NOTHING`,
      [actorId]
    );
    const profile = await client.query<{ status: string }>("SELECT status FROM profiles WHERE id = $1", [actorId]);
    if (profile.rows[0]?.status !== "ACTIVE") {
      throw new DomainError("FORBIDDEN", 403, "Account is not eligible for seller onboarding");
    }
  }

  private async inspectSellerDocuments(
    actorId: string,
    input: CreateShopInput
  ): Promise<{ avatar: CatalogImageObject; cccdFront: CatalogImageObject; cccdBack: CatalogImageObject }> {
    const prefix = `seller-onboarding/${actorId}/`;
    if (!input.documents.avatarKey.startsWith(`${prefix}avatar/`)
      || !input.documents.cccdFrontKey.startsWith(`${prefix}cccd/`)
      || !input.documents.cccdBackKey.startsWith(`${prefix}cccd/`)
      || input.documents.cccdFrontKey === input.documents.cccdBackKey) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Seller onboarding document not found");
    }
    const [avatar, cccdFront, cccdBack] = await Promise.all([
      this.avatarStorage.inspectObject(input.documents.avatarKey),
      this.kycStorage.inspectObject(input.documents.cccdFrontKey),
      this.kycStorage.inspectObject(input.documents.cccdBackKey)
    ]);
    for (const document of [avatar, cccdFront, cccdBack]) this.requireReadableImage(document);
    return { avatar: avatar!, cccdFront: cccdFront!, cccdBack: cccdBack! };
  }

  private requireReadableImage(document: CatalogImageObject | null): void {
    if (!document || !["image/jpeg", "image/png", "image/webp"].includes(document.mimeType)
      || document.sizeBytes <= 0 || document.sizeBytes > 5 * 1024 * 1024
      || !Number.isInteger(document.width) || document.width <= 0
      || !Number.isInteger(document.height) || document.height <= 0
      || !/^[a-f0-9]{64}$/.test(document.sha256)) {
      throw new DomainError("VALIDATION_FAILED", 422, "Seller document must be a readable JPEG, PNG or WebP up to 5 MiB");
    }
  }

  private encrypt(value: string): Buffer {
    return encryptPii(value, this.piiEncryptionKey);
  }

  async getActorContext(actorId: string): Promise<ActorContext> {
    const profile = await this.pool.query<{ status: ActorContext["profileStatus"] }>(
      "SELECT status FROM profiles WHERE id = $1",
      [actorId]
    );
    const memberships = await this.pool.query<MembershipRow>(
      `SELECT sm.shop_id, s.display_name, sm.role,
              sm.status AS membership_status, s.kyc_status, s.status AS shop_status
       FROM shop_memberships sm
       JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1
       ORDER BY sm.created_at ASC`,
      [actorId]
    );

    return {
      id: actorId,
      profileStatus: profile.rows[0]?.status ?? null,
      shops: memberships.rows.map((row) => ({
        id: row.shop_id,
        displayName: row.display_name,
        role: row.role,
        membershipStatus: row.membership_status,
        kycStatus: row.kyc_status,
        status: row.shop_status
      }))
    };
  }

  async requireShopCapability(
    client: PoolClient,
    actorId: string,
    shopId: string,
    capability: ShopCapability
  ): Promise<ShopAccess> {
    const result = await client.query<MembershipRow>(
      `SELECT sm.shop_id, s.display_name, sm.role,
              sm.status AS membership_status, s.kyc_status, s.status AS shop_status
       FROM shop_memberships sm
       JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1 AND sm.shop_id = $2
       FOR KEY SHARE OF sm, s`,
      [actorId, shopId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new DomainError("RESOURCE_NOT_FOUND", 404, "Shop not found");
    }
    if (row.membership_status !== "ACTIVE" || !capabilityRoles[capability].has(row.role)) {
      throw new DomainError("FORBIDDEN", 403, "Shop capability denied");
    }

    return {
      shopId: row.shop_id,
      displayName: row.display_name,
      role: row.role,
      kycStatus: row.kyc_status,
      shopStatus: row.shop_status
    };
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return typeof error === "object" && error !== null
    && "code" in error && error.code === "23505"
    && "constraint" in error && error.constraint === constraint;
}
