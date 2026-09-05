import { z } from "zod";

export const shopRoleSchema = z.enum(["OWNER", "MANAGER", "WAREHOUSE", "ACCOUNTING"]);
export type ShopRole = z.infer<typeof shopRoleSchema>;

export const shopCapabilitySchema = z.enum(["CREATE_LISTING", "PUBLISH_LISTING"]);
export type ShopCapability = z.infer<typeof shopCapabilitySchema>;

export const sellerDocumentKindSchema = z.enum(["AVATAR", "CCCD_FRONT", "CCCD_BACK", "SELFIE"]);
export type SellerDocumentKind = z.infer<typeof sellerDocumentKindSchema>;

export const createSellerDocumentUploadSchema = z.object({
  kind: sellerDocumentKindSchema,
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024)
}).strict();
export type CreateSellerDocumentUploadInput = z.infer<typeof createSellerDocumentUploadSchema>;

export const createShopSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  legalType: z.enum(["INDIVIDUAL", "HOUSEHOLD", "ENTERPRISE"]),
  description: z.string().trim().min(10).max(500),
  phone: z.string().regex(/^0\d{9}$/, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"),
  pickupAddress: z.object({
    contactName: z.string().trim().min(2).max(120),
    addressLine: z.string().trim().min(5).max(250),
    province: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100),
    ward: z.string().trim().min(2).max(100)
  }),
  kyc: z.object({
    taxCode: z.string().trim().min(5).max(30),
    bankCode: z.string().trim().min(2).max(30),
    bankAccount: z.string().trim().min(6).max(30),
    accountHolder: z.string().trim().min(2).max(120)
  }),
  documents: z.object({
    avatarKey: z.string().min(1).max(500),
    cccdFrontKey: z.string().min(1).max(500),
    cccdBackKey: z.string().min(1).max(500)
  }),
  carrierCodes: z.array(z.enum(["GHN", "GHTK"])).min(1).max(2)
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

export const shopSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: shopRoleSchema,
  membershipStatus: z.string(),
  kycId: z.string().nullable(),
  kycStatus: z.enum(["PENDING", "PROCESSING", "VERIFIED", "REJECTED", "MANUAL_REVIEW"]),
  status: z.enum(["ONBOARDING", "ACTIVE", "PAUSED", "LOCKED_INSUFFICIENT_FUND", "SUSPENDED"])
});

export const actorContextSchema = z.object({
  id: z.string().uuid(),
  profileStatus: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).nullable(),
  shops: z.array(shopSummarySchema)
});
export type ActorContext = z.infer<typeof actorContextSchema>;
