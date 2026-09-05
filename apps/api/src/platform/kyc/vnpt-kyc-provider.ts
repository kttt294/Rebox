import type { KycIdentity, KycImage, KycProvider } from "@rebox/backend";
import { randomUUID } from "node:crypto";

type JsonObject = Record<string, unknown>;

export type VnptKycConfig = {
  baseUrl: string;
  accessToken: string;
  tokenId: string;
  tokenKey: string;
  macAddress: string;
  ocrPath: string;
  documentValidationPath: string;
  faceComparePath: string;
  livenessPath: string;
  faceThreshold: number;
  livenessThreshold: number;
};

export class VnptKycProvider implements KycProvider {
  readonly name = "VNPT";

  constructor(private readonly config: VnptKycConfig) {}

  async analyzeDocument(side: "front" | "back", image: KycImage) {
    const [ocrResponse, validationResponse] = await Promise.all([
      this.post(`${this.config.ocrPath}?type=${side}`, { img: image }),
      this.post(this.config.documentValidationPath, { img: image })
    ]);
    const ocr = firstObject(ocrResponse.object);
    const validation = firstObject(validationResponse.object);
    const reference = readString(ocrResponse, "request_id", "requestId", "client_session");
    return {
      identity: normalizeIdentity(ocr),
      documentValid: readPass(validation, 0.5),
      ...(reference ? { reference } : {})
    };
  }

  async compareFace(document: KycImage, selfie: KycImage) {
    const response = await this.post(this.config.faceComparePath, { img_front: document, img_back: selfie });
    const result = firstObject(response.object);
    const score = readScore(result);
    const reference = readString(response, "request_id", "requestId", "client_session");
    return {
      matched: readPass(result, this.config.faceThreshold, score),
      score,
      ...(reference ? { reference } : {})
    };
  }

  async checkLiveness(selfie: KycImage) {
    const response = await this.post(this.config.livenessPath, { img: selfie });
    const result = firstObject(response.object);
    const score = readScore(result);
    const reference = readString(response, "request_id", "requestId", "client_session");
    return {
      passed: readPass(result, this.config.livenessThreshold, score),
      score,
      ...(reference ? { reference } : {})
    };
  }

  private async post(path: string, images: Record<string, KycImage>): Promise<JsonObject> {
    const form = new FormData();
    for (const [name, image] of Object.entries(images)) {
      form.set(name, new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }), `${name}.jpg`);
    }
    form.set("client_session", randomUUID());
    const response = await fetch(new URL(path, this.config.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.accessToken}`,
        "token-id": this.config.tokenId,
        "token-key": this.config.tokenKey,
        "mac-address": this.config.macAddress
      },
      body: form,
      signal: AbortSignal.timeout(20_000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !isObject(body)) throw new Error(`VNPT eKYC HTTP ${response.status}`);
    const message = readString(body, "message");
    if (message && /^IDG-/.test(message) && message !== "IDG-00000000") throw new Error("VNPT eKYC rejected request");
    return body;
  }
}

type VnptKycEnvironmentConfig = Omit<
  VnptKycConfig,
  "baseUrl" | "accessToken" | "tokenId" | "tokenKey" | "macAddress"
> & {
  baseUrl: string | undefined;
  accessToken: string | undefined;
  tokenId: string | undefined;
  tokenKey: string | undefined;
  macAddress: string | undefined;
};

export function createVnptKycProvider(config: VnptKycEnvironmentConfig): KycProvider {
  const required = [config.baseUrl, config.accessToken, config.tokenId, config.tokenKey, config.macAddress];
  if (required.some((value) => !value)) {
    if (process.env.NODE_ENV === "production") throw new Error("VNPT eKYC credentials are required");
    return unavailableKycProvider;
  }
  return new VnptKycProvider(config as VnptKycConfig);
}

const unavailableKycProvider: KycProvider = {
  name: "VNPT",
  analyzeDocument: async () => Promise.reject(new Error("VNPT eKYC is not configured")),
  compareFace: async () => Promise.reject(new Error("VNPT eKYC is not configured")),
  checkLiveness: async () => Promise.reject(new Error("VNPT eKYC is not configured"))
};

export function normalizeIdentity(value: JsonObject): KycIdentity {
  return compact({
    citizenId: readString(value, "id", "id_number", "citizen_id"),
    fullName: readString(value, "name", "full_name"),
    dateOfBirth: readString(value, "birth_day", "date_of_birth", "dob"),
    gender: readString(value, "gender"),
    address: readString(value, "recent_location", "address", "origin_location"),
    issuedAt: readString(value, "issue_date", "issued_at")
  }) as KycIdentity;
}

function readPass(value: JsonObject, threshold: number, score = readScore(value)): boolean {
  for (const key of ["valid", "matched", "liveness", "result"]) {
    const raw = value[key];
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (/khong|fail|fake|invalid|mismatch/.test(normalized)) return false;
      if (/success|real|valid|match|khop|that/.test(normalized)) return true;
    }
  }
  return score >= threshold;
}

function readScore(value: JsonObject): number {
  for (const key of ["prob", "score", "similarity", "confidence"]) {
    const raw = value[key];
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
  }
  return 0;
}

function firstObject(value: unknown): JsonObject {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isObject(candidate)) throw new Error("Unexpected VNPT eKYC response");
  return candidate;
}

function readString(value: JsonObject, ...keys: string[]): string | undefined {
  for (const key of keys) if (typeof value[key] === "string" && value[key]) return value[key].trim();
  return undefined;
}

function compact<T extends JsonObject>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}
