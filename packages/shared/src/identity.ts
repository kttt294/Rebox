import { z } from "zod";

export const shopRoleSchema = z.enum(["OWNER", "MANAGER", "WAREHOUSE", "ACCOUNTING"]);
export type ShopRole = z.infer<typeof shopRoleSchema>;

export const shopCapabilitySchema = z.enum(["CREATE_LISTING", "PUBLISH_LISTING"]);
export type ShopCapability = z.infer<typeof shopCapabilitySchema>;

export const createShopSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  legalType: z.enum(["INDIVIDUAL", "HOUSEHOLD", "ENTERPRISE"])
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

export const shopSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: shopRoleSchema,
  membershipStatus: z.string(),
  kycStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  status: z.enum(["ONBOARDING", "ACTIVE", "PAUSED", "LOCKED_INSUFFICIENT_FUND", "SUSPENDED"])
});

export const actorContextSchema = z.object({
  id: z.string().uuid(),
  profileStatus: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).nullable(),
  shops: z.array(shopSummarySchema)
});
export type ActorContext = z.infer<typeof actorContextSchema>;
