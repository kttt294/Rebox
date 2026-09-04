import { describe, expect, it } from "vitest";
import {
  createCatalogImageUploadSchema,
  createListingSchema,
  createShopSchema,
  listingPolicyResultSchema,
  publicListingsQuerySchema,
  updateListingDraftSchema
} from "../src";

describe("Sprint 1 contracts", () => {
  it("accepts a minimal manual listing", () => {
    expect(
      createListingSchema.safeParse({
        title: "Áo khoác hoàn đơn",
        categoryId: "fashion",
        conditionGrade: "GOOD",
        conditionNotes: "Xước nhẹ ở khóa kéo",
        price: 120_000,
        weightGram: 500
      }).success
    ).toBe(true);
  });

  it("rejects unsafe money and incomplete condition notes", () => {
    expect(
      createListingSchema.safeParse({
        title: "Áo khoác hoàn đơn",
        categoryId: "fashion",
        conditionGrade: "GOOD",
        conditionNotes: "x",
        price: 12.5,
        weightGram: 500
      }).success
    ).toBe(false);
  });

  it("rejects server-owned fields when updating a draft", () => {
    expect(
      updateListingDraftSchema.safeParse({
        title: "Áo khoác hoàn đơn",
        categoryId: "fashion",
        conditionGrade: "GOOD",
        conditionNotes: "Xước nhẹ ở khóa kéo",
        price: 120_000,
        weightGram: 500,
        status: "ACTIVE"
      }).success
    ).toBe(false);
  });

  it("accepts a backend-owned policy result", () => {
    expect(listingPolicyResultSchema.safeParse({
      outcome: "PENDING_REVIEW",
      policyLevel: "MANUAL_REVIEW",
      policyVersion: "2026-08-25-dev",
      message: "Listing is pending manual review"
    }).success).toBe(true);
  });

  it("accepts only supported catalog images up to 5 MiB", () => {
    expect(createCatalogImageUploadSchema.safeParse({ mimeType: "image/webp", sizeBytes: 5 * 1024 * 1024 }).success)
      .toBe(true);
    expect(createCatalogImageUploadSchema.safeParse({ mimeType: "image/svg+xml", sizeBytes: 100 }).success)
      .toBe(false);
    expect(createCatalogImageUploadSchema.safeParse({ mimeType: "image/png", sizeBytes: 5 * 1024 * 1024 + 1 }).success)
      .toBe(false);
  });

  it("normalizes a public catalog query and defaults to newest", () => {
    expect(publicListingsQuerySchema.parse({ q: "  vay lua  ", category: "", shopId: "  shop-1  " })).toEqual({
      q: "vay lua",
      category: undefined,
      shopId: "shop-1",
      sort: "newest"
    });
  });

  it("normalizes shop names at the trust boundary", () => {
    expect(createShopSchema.parse({ displayName: "  Shop Mộc  ", legalType: "INDIVIDUAL" }).displayName).toBe("Shop Mộc");
  });
});
