import { describe, expect, it } from "vitest";
import { createListingSchema, createShopSchema } from "../src";

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

  it("normalizes shop names at the trust boundary", () => {
    expect(createShopSchema.parse({ displayName: "  Shop Mộc  ", legalType: "INDIVIDUAL" }).displayName).toBe("Shop Mộc");
  });
});
