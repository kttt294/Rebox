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

export const listingSchema = createListingSchema.extend({
  id: z.string(),
  shopId: z.string(),
  shopDisplayName: z.string(),
  images: z.array(z.object({ key: z.string(), width: z.number().int(), height: z.number().int() })),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "HIDDEN_BY_FUND", "RESERVED", "SOLD", "RELISTABLE", "SUSPENDED", "DELISTED"]),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type Listing = z.infer<typeof listingSchema>;

export const publicListingSchema = listingSchema.omit({ images: true, status: true, weightGram: true });
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
