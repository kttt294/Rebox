import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DomainError } from "../src/errors";
import { parseReturnManifestSpreadsheet } from "../src/modules/inventory/return-manifest-spreadsheet";

const fixtureDirectory = resolve(process.cwd(), "docs/fixtures/return-import");

describe("return manifest spreadsheet", () => {
  it("normalizes the CSV and XLSX fixtures to the same package drafts", async () => {
    const [csv, xlsx] = await Promise.all([
      readFile(resolve(fixtureDirectory, "rebox-return-import-sample.csv")),
      readFile(resolve(fixtureDirectory, "rebox-return-import-sample.xlsx"))
    ]);

    const csvPreview = await parseReturnManifestSpreadsheet("manifest.csv", csv);
    const xlsxPreview = await parseReturnManifestSpreadsheet("manifest.xlsx", xlsx);

    expect(xlsxPreview.drafts).toEqual(csvPreview.drafts);
    expect(csvPreview.drafts).toHaveLength(2);
    expect(csvPreview.drafts[0]?.lines).toHaveLength(2);
    expect(csvPreview.drafts[0]?.lines[0]?.sourceQuantity).toBe(3);
  });

  it("groups by platform and tracking instead of SKU", async () => {
    const fixture = (await readFile(resolve(fixtureDirectory, "rebox-return-import-sample.csv"), "utf8"))
      .replace("DEN-BAN-TRANG", "AO-DEN-M");

    const preview = await parseReturnManifestSpreadsheet("manifest.csv", Buffer.from(fixture));

    expect(preview.drafts).toHaveLength(2);
    expect(preview.drafts.map((draft) => draft.sourceTrackingNo)).toEqual(["TRACK-001", "TRACK-002"]);
  });

  it("marks every row in a package when repeated package fields conflict", async () => {
    const fixture = (await readFile(resolve(fixtureDirectory, "rebox-return-import-sample.csv"), "utf8"))
      .replace(",930,35,25,15,https://example.test/mu-den.jpg", ",931,35,25,15,https://example.test/mu-den.jpg");

    const preview = await parseReturnManifestSpreadsheet("manifest.csv", Buffer.from(fixture));

    expect(preview.rows.filter((row) => row.packageGroup === "SHOPEE:TRACK-001")
      .every((row) => row.errorCodes.includes("PACKAGE_FIELD_CONFLICT"))).toBe(true);
    expect(preview.drafts.map((draft) => draft.sourceTrackingNo)).not.toContain("TRACK-001");
  });

  it("rejects PII columns before producing a preview", async () => {
    const fixture = await readFile(resolve(fixtureDirectory, "rebox-return-import-sample.csv"), "utf8");
    const withPii = fixture.replace("source_platform,", "buyer_phone,source_platform,")
      .replace("SHOPEE,", "0900000000,SHOPEE,");

    await expect(parseReturnManifestSpreadsheet("manifest.csv", Buffer.from(withPii)))
      .rejects.toMatchObject<Partial<DomainError>>({ code: "PII_COLUMN_FORBIDDEN", status: 422 });
  });
});
