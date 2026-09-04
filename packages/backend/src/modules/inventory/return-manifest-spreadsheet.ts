import type { ReturnManifestDraft, ReturnManifestPreviewRow } from "@rebox/shared";
import { returnManifestDraftSchema } from "@rebox/shared";
import readXlsxFile from "read-excel-file/node";
import { DomainError } from "../../errors";

const headers = [
  "source_platform",
  "source_order_ref",
  "source_return_ref",
  "source_tracking_no",
  "source_item_ref",
  "source_sku",
  "source_quantity",
  "product_name",
  "variant_name",
  "brand",
  "source_category",
  "original_unit_price_vnd",
  "return_reason_raw",
  "return_reason",
  "returned_at",
  "package_weight_gram",
  "package_length_cm",
  "package_width_cm",
  "package_height_cm",
  "product_image_urls",
  "rebox_category_id",
  "package_disclosure",
  "outer_package_notes",
  "package_listing_price_vnd"
] as const;

type Header = (typeof headers)[number];
type ParsedSpreadsheet = {
  drafts: ReturnManifestDraft[];
  rows: ReturnManifestPreviewRow[];
};
type SpreadsheetSheet = { data: unknown[][] };

const maxRows = 5_000;

export async function parseReturnManifestSpreadsheet(fileName: string, file: Buffer): Promise<ParsedSpreadsheet> {
  const extension = fileName.toLowerCase().match(/\.(csv|xlsx)$/)?.[1];
  if (!extension) {
    throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, "Only .csv and .xlsx files are supported");
  }

  try {
    const sheets: SpreadsheetSheet[] = extension === "csv"
      ? [{ data: parseCsv(file.toString("utf8")) }]
      : await readXlsxFile(file);
    const located = locateHeader(sheets);
    if (!located) {
      throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, "The spreadsheet does not contain the 24-column manifest header");
    }
    return parseWorksheet(located.data, located.headerRow, located.columns);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, "The spreadsheet could not be read");
  }
}

export function packageGroupOfDraft(draft: Pick<ReturnManifestDraft, "sourcePlatform" | "sourceTrackingNo">): string {
  return `${draft.sourcePlatform}:${draft.sourceTrackingNo}`;
}

function locateHeader(sheets: SpreadsheetSheet[]): {
  data: unknown[][];
  headerRow: number;
  columns: Map<Header, number>;
} | undefined {
  for (const { data } of sheets) {
    for (let rowIndex = 0; rowIndex < Math.min(data.length, 20); rowIndex += 1) {
      const row = data[rowIndex] ?? [];
      const normalized = row.map((value) => normalizeHeader(String(value ?? "")));
      if (!normalized.includes("source_platform") || !normalized.includes("source_tracking_no")) continue;
      const seen = new Map<string, number>();
      for (let column = 0; column < row.length; column += 1) {
        const value = normalized[column] ?? "";
        if (!value) continue;
        if (isForbiddenHeader(value)) {
          throw new DomainError("PII_COLUMN_FORBIDDEN", 422, `Forbidden PII column: ${value}`);
        }
        if (seen.has(value)) {
          throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, `Duplicate spreadsheet column: ${value}`);
        }
        seen.set(value, column);
      }
      if (headers.every((header) => seen.has(header))) {
        return {
          data,
          headerRow: rowIndex,
          columns: new Map(headers.map((header) => [header, seen.get(header)!]))
        };
      }
    }
  }
  return undefined;
}

function parseWorksheet(data: unknown[][], headerRow: number, columns: Map<Header, number>): ParsedSpreadsheet {
  const rows: ReturnManifestPreviewRow[] = [];
  const groups = new Map<string, {
    draft: ReturnManifestDraft;
    packageSignature: string;
    sourceItems: Set<string>;
    rowIndexes: number[];
    invalid: boolean;
  }>();

  for (let dataIndex = headerRow + 1; dataIndex < data.length; dataIndex += 1) {
    const rowIndex = dataIndex + 1;
    const row = data[dataIndex] ?? [];
    const raw = Object.fromEntries(headers.map((header) => [header, row[columns.get(header)!]])
    ) as Record<Header, unknown>;
    if (headers.every((header) => empty(raw[header]))) continue;
    if (rows.length >= maxRows) {
      throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, `A manifest can contain at most ${maxRows} data rows`);
    }

    const platform = text(raw.source_platform)?.toUpperCase() ?? "UNKNOWN";
    const tracking = text(raw.source_tracking_no)?.toUpperCase() ?? `ROW-${rowIndex}`;
    const packageGroup = `${platform}:${tracking}`;
    const previewRow: ReturnManifestPreviewRow = {
      rowIndex,
      packageGroup,
      warningCodes: [],
      errorCodes: []
    };
    rows.push(previewRow);

    const parsed = returnManifestDraftSchema.safeParse({
      source: "SPREADSHEET",
      sourcePlatform: platform,
      sourceTrackingNo: tracking,
      sourceOrderRef: optionalText(raw.source_order_ref),
      sourceReturnRef: optionalText(raw.source_return_ref),
      returnedAt: dateTime(raw.returned_at),
      packageWeightGram: optionalPositiveInteger(raw.package_weight_gram),
      packageDimensionsCm: dimensions(raw),
      packageListingPriceVnd: positiveInteger(raw.package_listing_price_vnd),
      lines: [{
        sourceItemRef: text(raw.source_item_ref),
        sourceSku: optionalText(raw.source_sku),
        sourceQuantity: positiveInteger(raw.source_quantity),
        productName: text(raw.product_name),
        variantName: optionalText(raw.variant_name),
        brand: optionalText(raw.brand),
        sourceCategory: optionalText(raw.source_category),
        originalUnitPriceVnd: optionalPositiveInteger(raw.original_unit_price_vnd),
        returnReason: optionalText(raw.return_reason),
        productImageUrls: imageUrls(raw.product_image_urls),
        reboxCategoryId: text(raw.rebox_category_id)
      }]
    });

    if (text(raw.package_disclosure) !== "UNOPENED_UNINSPECTED" || !parsed.success) {
      previewRow.errorCodes.push("INVALID_FIELD");
      const existing = groups.get(packageGroup);
      if (existing) {
        existing.rowIndexes.push(rowIndex);
        existing.invalid = true;
        markGroupError(rows, existing.rowIndexes, "INVALID_FIELD");
      }
      continue;
    }

    const draft = parsed.data;
    const packageSignature = JSON.stringify({ ...draft, lines: undefined });
    const existing = groups.get(packageGroup);
    if (!existing) {
      groups.set(packageGroup, {
        draft,
        packageSignature,
        sourceItems: new Set([draft.lines[0]!.sourceItemRef]),
        rowIndexes: [rowIndex],
        invalid: false
      });
      continue;
    }

    existing.rowIndexes.push(rowIndex);
    if (existing.packageSignature !== packageSignature) {
      markGroupError(rows, existing.rowIndexes, "PACKAGE_FIELD_CONFLICT");
      existing.invalid = true;
      continue;
    }
    const line = draft.lines[0]!;
    if (existing.sourceItems.has(line.sourceItemRef)) {
      markGroupError(rows, existing.rowIndexes, "DUPLICATE_SOURCE_ITEM_REF");
      existing.invalid = true;
      continue;
    }
    existing.sourceItems.add(line.sourceItemRef);
    existing.draft.lines.push(line);
  }

  for (const group of groups.values()) {
    if (!group.invalid) continue;
    const groupRows = rows.filter((row) => group.rowIndexes.includes(row.rowIndex));
    const groupErrors = new Set(groupRows.flatMap((row) => row.errorCodes));
    for (const code of groupErrors) markGroupError(rows, group.rowIndexes, code);
  }

  return {
    rows,
    drafts: [...groups.values()].filter((group) => !group.invalid).map((group) => group.draft)
  };
}

function markGroupError(
  rows: ReturnManifestPreviewRow[],
  rowIndexes: number[],
  code: ReturnManifestPreviewRow["errorCodes"][number]
): void {
  const indexes = new Set(rowIndexes);
  for (const row of rows) {
    if (indexes.has(row.rowIndex) && !row.errorCodes.includes(code)) row.errorCodes.push(code);
  }
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function isForbiddenHeader(header: string): boolean {
  return /(^|_)(buyer|recipient)(_|$)/.test(header)
    || /(^|_)(phone|address|payment|chat|raw_pii)(_|$)/.test(header);
}

function empty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function text(value: unknown): string | undefined {
  if (empty(value)) return undefined;
  return String(value).trim();
}

function optionalText(value: unknown): string | undefined {
  return text(value);
}

function positiveInteger(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(text(value));
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return empty(value) ? undefined : positiveInteger(value);
}

function positiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function dimensions(raw: Record<Header, unknown>): ReturnManifestDraft["packageDimensionsCm"] | undefined {
  const values = [raw.package_length_cm, raw.package_width_cm, raw.package_height_cm];
  if (values.every(empty)) return undefined;
  return {
    length: positiveNumber(values[0])!,
    width: positiveNumber(values[1])!,
    height: positiveNumber(values[2])!
  };
}

function dateTime(value: unknown): string | undefined {
  if (empty(value)) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? String(value) : new Date(Math.round(date.valueOf() / 1_000) * 1_000).toISOString();
}

function imageUrls(value: unknown): string[] {
  return text(value)?.split(/[;|\n]+/).map((url) => url.trim()).filter(Boolean) ?? [];
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new DomainError("SPREADSHEET_FORMAT_INVALID", 422, "The CSV contains an unclosed quoted field");
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
