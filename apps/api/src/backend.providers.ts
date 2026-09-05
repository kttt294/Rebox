import type { Provider } from "@nestjs/common";
import {
  IdentityModule,
  InventoryModule,
  KycModule,
  createDatabase,
  type BusinessVerificationProvider,
  type CatalogMediaStorage,
  type DatabaseContext
} from "@rebox/backend";
import { HttpBusinessVerificationProvider } from "./platform/kyc/http-business-verification-provider";
import { createVnptKycProvider } from "./platform/kyc/vnpt-kyc-provider";
import { SupabaseCatalogMediaStorage } from "./platform/storage/supabase-catalog-media-storage";

export const DATABASE = Symbol("DATABASE");
export const IDENTITY = Symbol("IDENTITY");
export const INVENTORY = Symbol("INVENTORY");
export const KYC = Symbol("KYC");
export const KYC_PROVIDER = Symbol("KYC_PROVIDER");
export const BUSINESS_VERIFICATION_PROVIDER = Symbol("BUSINESS_VERIFICATION_PROVIDER");
export const CATALOG_MEDIA_STORAGE = Symbol("CATALOG_MEDIA_STORAGE");
export const SELLER_KYC_STORAGE = Symbol("SELLER_KYC_STORAGE");

function trackingSecret(name: "RETURN_TRACKING_ENCRYPTION_KEY" | "RETURN_TRACKING_HMAC_KEY"): string {
  const configured = process.env[name];
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error(`${name} is required`);
  return `local-dev-only-${name}-change-before-production`;
}

function sellerPiiEncryptionSecret(): string {
  const configured = process.env.SELLER_PII_ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("SELLER_PII_ENCRYPTION_KEY is required");
  return "local-dev-only-seller-pii-encryption-key-change-before-production";
}

export const backendProviders: Provider[] = [
  {
    provide: DATABASE,
    useFactory: (): DatabaseContext =>
      createDatabase(
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
  },
  {
    provide: CATALOG_MEDIA_STORAGE,
    useFactory: (): CatalogMediaStorage => {
      const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
      const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required for catalog media storage");
      return new SupabaseCatalogMediaStorage(url, secretKey);
    }
  },
  {
    provide: SELLER_KYC_STORAGE,
    useFactory: (): CatalogMediaStorage => {
      const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
      const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required for seller KYC storage");
      return new SupabaseCatalogMediaStorage(url, secretKey, "seller-kyc");
    }
  },
  {
    provide: KYC_PROVIDER,
    useFactory: () => createVnptKycProvider({
      baseUrl: process.env.VNPT_EKYC_BASE_URL,
      accessToken: process.env.VNPT_EKYC_ACCESS_TOKEN,
      tokenId: process.env.VNPT_EKYC_TOKEN_ID,
      tokenKey: process.env.VNPT_EKYC_TOKEN_KEY,
      macAddress: process.env.VNPT_EKYC_MAC_ADDRESS,
      ocrPath: process.env.VNPT_EKYC_OCR_PATH ?? "/ai/v1/ocr/id",
      documentValidationPath: process.env.VNPT_EKYC_DOCUMENT_VALIDATION_PATH ?? "/ai/v1/card/liveness",
      faceComparePath: process.env.VNPT_EKYC_FACE_COMPARE_PATH ?? "/ai/v1/face/compare",
      livenessPath: process.env.VNPT_EKYC_LIVENESS_PATH ?? "/ai/v1/face/liveness",
      faceThreshold: Number(process.env.VNPT_EKYC_FACE_THRESHOLD ?? 0.9),
      livenessThreshold: Number(process.env.VNPT_EKYC_LIVENESS_THRESHOLD ?? 0.9)
    })
  },
  {
    provide: BUSINESS_VERIFICATION_PROVIDER,
    useFactory: (): BusinessVerificationProvider => new HttpBusinessVerificationProvider(
      process.env.TAX_VERIFICATION_URL,
      process.env.BANK_VERIFICATION_URL,
      process.env.BUSINESS_VERIFICATION_TOKEN
    )
  },
  {
    provide: KYC,
    inject: [DATABASE, SELLER_KYC_STORAGE, KYC_PROVIDER, BUSINESS_VERIFICATION_PROVIDER],
    useFactory: (database: DatabaseContext, storage: CatalogMediaStorage, provider: ReturnType<typeof createVnptKycProvider>, business: BusinessVerificationProvider) =>
      new KycModule(database.pool, sellerPiiEncryptionSecret(), storage, provider, business)
  },
  {
    provide: IDENTITY,
    inject: [DATABASE, CATALOG_MEDIA_STORAGE, SELLER_KYC_STORAGE],
    useFactory: (
      database: DatabaseContext,
      avatarStorage: CatalogMediaStorage,
      kycStorage: CatalogMediaStorage
    ): IdentityModule => new IdentityModule(database.pool, sellerPiiEncryptionSecret(), avatarStorage, kycStorage)
  },
  {
    provide: INVENTORY,
    inject: [DATABASE, IDENTITY, CATALOG_MEDIA_STORAGE],
    useFactory: (
      database: DatabaseContext,
      identity: IdentityModule,
      mediaStorage: CatalogMediaStorage
    ): InventoryModule => new InventoryModule(database.pool, identity, mediaStorage, {
      encryptionSecret: trackingSecret("RETURN_TRACKING_ENCRYPTION_KEY"),
      hmacSecret: trackingSecret("RETURN_TRACKING_HMAC_KEY")
    })
  }
];
