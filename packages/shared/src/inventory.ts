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

export const manifestImportSourceSchema = z.enum(["SPREADSHEET", "PLATFORM_API"]);
export type ManifestImportSource = z.infer<typeof manifestImportSourceSchema>;

export const returnManifestLineDraftSchema = z.object({
  sourceItemRef: z.string().trim().min(1).max(200),
  sourceSku: z.string().trim().min(1).max(200).optional(),
  sourceQuantity: z.number().int().positive().max(100_000),
  productName: z.string().trim().min(1).max(500),
  variantName: z.string().trim().min(1).max(500).optional(),
  brand: z.string().trim().min(1).max(200).optional(),
  sourceCategory: z.string().trim().min(1).max(500).optional(),
  originalUnitPriceVnd: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  returnReason: z.string().trim().min(1).max(200).optional(),
  productImageUrls: z.array(z.string().url()).max(20),
  reboxCategoryId: z.string().trim().min(1).max(80)
}).strict();

export const returnManifestDraftSchema = z.object({
  source: manifestImportSourceSchema,
  sourcePlatform: z.enum(["SHOPEE", "TIKTOK"]),
  sourceTrackingNo: z.string().trim().min(1).max(200),
  sourceOrderRef: z.string().trim().min(1).max(200).optional(),
  sourceReturnRef: z.string().trim().min(1).max(200).optional(),
  returnedAt: z.string().datetime().optional(),
  packageWeightGram: z.number().int().positive().max(100_000).optional(),
  packageDimensionsCm: z.object({
    length: z.number().positive().max(1_000),
    width: z.number().positive().max(1_000),
    height: z.number().positive().max(1_000)
  }).strict().optional(),
  packageListingPriceVnd: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  lines: z.array(returnManifestLineDraftSchema).min(1).max(5_000)
}).strict();
export type ReturnManifestDraft = z.infer<typeof returnManifestDraftSchema>;

export const returnManifestIssueCodeSchema = z.enum([
  "INVALID_FIELD",
  "INVALID_CATEGORY",
  "PACKAGE_FIELD_CONFLICT",
  "DUPLICATE_SOURCE_ITEM_REF"
]);
export type ReturnManifestIssueCode = z.infer<typeof returnManifestIssueCodeSchema>;

export const returnManifestPreviewRowSchema = z.object({
  rowIndex: z.number().int().positive(),
  packageGroup: z.string(),
  warningCodes: z.array(returnManifestIssueCodeSchema),
  errorCodes: z.array(returnManifestIssueCodeSchema)
});
export type ReturnManifestPreviewRow = z.infer<typeof returnManifestPreviewRowSchema>;

export const returnManifestPreviewSchema = z.object({
  batchId: z.string(),
  rows: z.array(returnManifestPreviewRowSchema),
  drafts: z.array(returnManifestDraftSchema),
  canCommit: z.boolean()
});
export type ReturnManifestPreview = z.infer<typeof returnManifestPreviewSchema>;

export const commitReturnManifestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200)
}).strict();
export type CommitReturnManifestInput = z.infer<typeof commitReturnManifestSchema>;

export const commitReturnManifestResultSchema = z.object({
  batchId: z.string(),
  packageIds: z.array(z.string()),
  lineCount: z.number().int().nonnegative()
});
export type CommitReturnManifestResult = z.infer<typeof commitReturnManifestResultSchema>;

export const maxReturnManifestFileBytes = 5 * 1024 * 1024;
