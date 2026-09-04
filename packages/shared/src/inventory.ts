import { z } from "zod";

export const listingConditionSchema = z.enum([
  "NEW_SEALED",
  "LIKE_NEW_99",
  "GOOD",
  "FAIR",
  "DEFECT"
]);

export const createListingSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(5_000).optional(),
  categoryId: z.string().trim().min(1).max(80),
  conditionGrade: listingConditionSchema,
  conditionNotes: z.string().trim().min(3).max(2_000),
  price: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  weightGram: z.number().int().positive().max(100_000)
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingDraftSchema = createListingSchema.strict();
export type UpdateListingDraftInput = z.infer<typeof updateListingDraftSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string()
});
export type Category = z.infer<typeof categorySchema>;

export const listingPolicyLevelSchema = z.enum(["BANNED", "MANUAL_REVIEW", "DISCLOSURE"]);
export type ListingPolicyLevel = z.infer<typeof listingPolicyLevelSchema>;

export const catalogImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxCatalogImageBytes = 5 * 1024 * 1024;
export const maxCatalogImages = 6;

export const createCatalogImageUploadSchema = z.object({
  mimeType: z.enum(catalogImageMimeTypes),
  sizeBytes: z.number().int().positive().max(maxCatalogImageBytes)
}).strict();
export type CreateCatalogImageUploadInput = z.infer<typeof createCatalogImageUploadSchema>;

export const completeCatalogImageUploadSchema = z.object({ key: z.string().min(1).max(500) }).strict();
export type CompleteCatalogImageUploadInput = z.infer<typeof completeCatalogImageUploadSchema>;

export const catalogImageUploadIntentSchema = z.object({
  key: z.string(),
  uploadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  headers: z.record(z.string(), z.string())
});
export type CatalogImageUploadIntent = z.infer<typeof catalogImageUploadIntentSchema>;

export const listingImageSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});
export type ListingImage = z.infer<typeof listingImageSchema>;

export const listingSchema = createListingSchema.extend({
  id: z.string(),
  shopId: z.string(),
  shopDisplayName: z.string(),
  images: z.array(listingImageSchema).max(maxCatalogImages),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "HIDDEN_BY_FUND", "RESERVED", "SOLD", "RELISTABLE", "SUSPENDED", "DELISTED"]),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type Listing = z.infer<typeof listingSchema>;

export const listingPolicyResultSchema = z.object({
  outcome: z.enum(["ACTIVE", "PENDING_REVIEW"]),
  policyLevel: listingPolicyLevelSchema.nullable(),
  policyVersion: z.string().nullable(),
  message: z.string()
});
export type ListingPolicyResult = z.infer<typeof listingPolicyResultSchema>;

export const publishListingResultSchema = z.object({
  listing: listingSchema,
  policy: listingPolicyResultSchema
});
export type PublishListingResult = z.infer<typeof publishListingResultSchema>;

export const publicListingSchema = listingSchema.omit({ status: true, weightGram: true });
export type PublicListing = z.infer<typeof publicListingSchema>;

const optionalQueryText = (maxLength: number) =>
  z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(maxLength).optional());

export const publicListingsQuerySchema = z.object({
  cursor: optionalQueryText(512),
  q: optionalQueryText(180),
  category: optionalQueryText(80),
  shopId: optionalQueryText(80),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest")
}).strict();
export type PublicListingsQuery = z.infer<typeof publicListingsQuerySchema>;

export const publicListingPageSchema = z.object({
  items: z.array(publicListingSchema),
  nextCursor: z.string().nullable()
});
export type PublicListingPage = z.infer<typeof publicListingPageSchema>;
