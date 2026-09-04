# REBOX — Kế hoạch session tiếp theo: nền nhập bản kê

> Cập nhật ngày 04/09/2026. Bước 1 (chốt lại tài liệu và domain) đã hoàn thành; session tiếp theo chỉ làm bước 2–5.

## 1. Trạng thái bước 1 — đã làm xong

Tài liệu canonical đã thống nhất:

- Seller có hai lựa chọn ngang hàng: `PLATFORM_API` và `SPREADSHEET`.
- UI đích có hai nút: **Import trực tiếp từ Shopee/TikTok** và **Import CSV/XLSX**.
- Hai nguồn cùng tạo `ReturnManifestDraft[]` rồi đi qua preview → validate → commit.
- Không có quy tắc “API ưu tiên, CSV fallback”. Nếu một kênh lỗi, seller tự chọn kênh còn lại.
- Bản đầu chỉ bật CSV/XLSX. Nút API hiển thị **Sắp có** hoặc nằm sau feature flag cho tới khi đủ partner/ToS/credential gate.
- Scan là bước sau import và chỉ lookup package local đã commit; scan không tự gọi API.

Domain vẫn giữ nguyên: một `ReturnPackage` chưa mở là một đơn vị tồn và sau này tạo tối đa một listing số lượng 1; `ReturnLine` chỉ là dòng nguồn khai báo, không phải món REBOX đã kiểm đếm.

## 2. Mục tiêu session tiếp theo

Chỉ dựng nền nhập dữ liệu:

```text
Seller thấy hai nút chọn nguồn
→ chọn CSV/XLSX
→ hệ thống parse và chuẩn hóa thành ReturnManifestDraft[]
→ seller xem preview + lỗi theo dòng/package
→ commit idempotent thành ReturnPackage + ReturnLine
```

Kết thúc session này **chưa quét mã, chưa tạo listing và chưa publish**. Hai phần đó được để lại cho bước 6–7.

## 3. Bước 2 — Hai nút chọn nguồn trên UI

- Thêm hai action cùng cấp bậc trên màn seller import:
  - **Import trực tiếp từ Shopee/TikTok** — disabled với nhãn `Sắp có` hoặc tắt bằng feature flag.
  - **Import bằng CSV/XLSX** — hoạt động thật, chấp nhận `.csv` và `.xlsx`.
- Cả hai hướng về cùng một màn preview; không tạo hai bộ UI preview riêng.
- Không tự chuyển kênh khi lỗi. Lỗi spreadsheet chỉ hiện lỗi spreadsheet; lỗi API tương lai chỉ hiện lỗi API.
- Giữ accessibility tối thiểu: button thật, label trạng thái rõ, focus/keyboard hoạt động và input file có mô tả định dạng.

**Kiểm tra:** UI test thấy đủ hai nút, nút spreadsheet mở file picker và nút API không phát request khi đang disabled.

## 4. Bước 3 — Contract chung cho hai nguồn

Định nghĩa ở package shared hiện có, không tạo plugin framework:

```ts
type ManifestImportSource = "SPREADSHEET" | "PLATFORM_API";

type ReturnManifestDraft = {
  source: ManifestImportSource;
  sourcePlatform: "SHOPEE" | "TIKTOK";
  sourceTrackingNo: string;
  sourceOrderRef?: string;
  sourceReturnRef?: string;
  returnedAt?: string;
  packageWeightGram?: number;
  packageDimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  packageListingPriceVnd: number;
  lines: Array<{
    sourceItemRef: string;
    sourceSku?: string;
    sourceQuantity: number;
    productName: string;
    variantName?: string;
    brand?: string;
    sourceCategory?: string;
    originalUnitPriceVnd?: number;
    returnReason?: string;
    productImageUrls: string[];
    reboxCategoryId: string;
  }>;
};
```

Chỉ cần giữ `ManifestImportSource` và DTO chung. Chưa tạo `PlatformApiManifestImporter`, OAuth client, scheduler hoặc response giả. Khi API thật xuất hiện, adapter API chỉ cần tạo cùng DTO và gọi lại pipeline preview/commit.

**Kiểm tra:** contract không có `ReturnUnit`, `received_quantity`, buyer name/phone/address hoặc field ngụ ý đã mở kiểm tra.

## 5. Bước 4 — Preview CSV/XLSX

- Dùng fixture 24 cột tại `docs/fixtures/return-import/` làm contract mẫu.
- CSV và XLSX phải tạo ra cùng `ReturnManifestDraft[]` cho cùng dữ liệu.
- Một dòng file là một `ReturnLine`; nhóm các dòng cùng tracking thành một `ReturnPackage` draft.
- Field cấp package lặp trên nhiều dòng phải giống nhau. Nếu khác, trả lỗi package conflict có mã ổn định.
- `source_quantity` chỉ là số lượng nguồn khai báo. Nhiều SKU hoặc quantity lớn hơn 1 vẫn chỉ là nội dung dự kiến của một kiện.
- Không gom hai package chỉ vì cùng SKU. Khóa nhóm package là tracking trong phạm vi shop/platform.
- Preview trả tối thiểu: `rowIndex`, package group, normalized draft, warning/error code và `canCommit`.
- Chặn buyer/recipient name, phone, address, payment, chat và raw PII trước khi lưu bất kỳ preview payload nào.
- Chỉ lưu dữ liệu đã allowlist; không giữ raw file nếu chưa có retention policy rõ.

**Kiểm tra:** test CSV/XLSX tương đương, package nhiều SKU, `source_quantity > 1`, hai package cùng SKU không bị gom, field package mâu thuẫn và cột PII bị chặn.

## 6. Bước 5 — Commit idempotent

- Thêm migration tối thiểu cho `return_import_batches`, `return_packages` và `return_lines`; chưa thêm liên kết listing trong session này.
- Batch lưu nguồn, file hash, trạng thái preview/commit, dữ liệu normalized đã allowlist và kết quả commit; không lưu raw PII.
- Package unique theo `(shop_id, source_platform, source_tracking_hash)`.
- Line unique theo `(return_package_id, source_item_ref)`.
- Commit chạy trong transaction và ghi `manifest_source = SPREADSHEET`, `manifest_hash`, version/provenance.
- Retry cùng batch hoặc cùng idempotency key + payload phải trả lại cùng kết quả, không tạo thêm package/line.
- Cùng idempotency key nhưng payload khác trả `409`.
- Cùng khóa package nhưng manifest khác trả conflict; không âm thầm ghi đè.
- Tracking lưu mã hóa + HMAC theo pattern bảo mật hiện có và không được trả ở public API.
- Không tạo listing trong commit. Manual listing hiện hành phải tiếp tục chạy như cũ.

**Kiểm tra:** migration chạy trên database test sạch; retry 100 lần vẫn có một batch/package/tập line; hai shop dùng cùng tracking vẫn tạo hai package riêng; transaction lỗi không để dữ liệu nửa chừng.

## 7. Ngoài phạm vi session này

- Live API Shopee/TikTok, OAuth, scheduler hoặc adapter giả.
- [Bước 6 — Quét shipper label từ dữ liệu đã import](https://app.notion.com/p/3d14a5367da38167b7ceddc357d471de?pvs=204).
- [Bước 7 — E2E import → quét → listing nguyên kiện](https://app.notion.com/p/3d14a5367da381b1bf8ff22fef2b5044?pvs=204).
- Publish, public response, reservation, checkout và vận đơn outbound.
- Mở kiện, kiểm đếm, inspection, condition từng sản phẩm hoặc `ReturnUnit`.
- Ghép sản phẩm theo SKU hoặc tự tạo `CatalogProduct`.
- Refactor không liên quan, dependency “để sau này dùng”, `db:reset` hoặc lệnh phá dữ liệu.

## 8. Điều kiện hoàn thành

- UI có đúng hai nút nguồn; chỉ CSV/XLSX hoạt động ở bản đầu.
- CSV và XLSX cùng dữ liệu cho cùng normalized draft.
- Preview parse/validate và chưa ghi `ReturnPackage`/`ReturnLine`; nếu lưu batch tạm thì chỉ lưu dữ liệu đã allowlist.
- Commit tạo đúng package/line và retry không tạo trùng.
- Không có PII buyer gốc, `ReturnUnit`, bước kiểm đếm hoặc listing trong slice này.
- Shared DTO, backend, controller, OpenAPI và generated client đồng bộ.
- Test liên quan, lint, typecheck, build và `git diff --check` pass.

## 9. Prompt dùng cho session tiếp theo

```text
Làm việc trong repo /Users/minhsang/Rebox.

Mục tiêu: chỉ triển khai bước 2–5 trong docs/10-NEXT-SESSION-PLAN.md:
hai nút chọn nguồn import, ReturnManifestDraft chung, preview CSV/XLSX và
commit ReturnPackage/ReturnLine idempotent. Không làm scan hoặc listing.

Trước khi sửa:
1. Chạy git status và giữ nguyên mọi thay đổi hiện có.
2. Đọc CONTEXT.md; docs/07-ARCHITECTURE-DECISIONS.md A06/A16;
   docs/10-NEXT-SESSION-PLAN.md và hai fixture return-import.
3. Đọc schema/migration, InventoryModule, shared contracts, OpenAPI/client và
   màn seller hiện có. Tìm và reuse pattern đã có trước khi thêm code.
4. Nêu kế hoạch ngắn với cách kiểm tra từng bước.

Giữ đúng domain:
- PLATFORM_API và SPREADSHEET là hai kênh ngang hàng do seller chọn.
- Bản đầu chỉ bật CSV/XLSX; nút API là Sắp có/feature-flagged.
- Cả hai nguồn cùng tạo ReturnManifestDraft[] và dùng chung preview/commit.
- Không có API ưu tiên hoặc CSV fallback tự động.
- ReturnPackage là nguyên kiện chưa mở; ReturnLine chỉ là dòng nguồn khai báo.
- source_quantity không phải tồn vật lý; cùng SKU không có nghĩa cùng sản phẩm.
- Không tạo ReturnUnit, received_quantity, intake/inspection hoặc grouping SKU.
- Tracking mã hóa/HMAC; chặn PII buyer gốc ngay tại ingest.

Thực hiện diff nhỏ nhất:
1. UI có hai nút nguồn; spreadsheet hoạt động, API không phát request.
2. Shared ManifestImportSource + ReturnManifestDraft.
3. Preview CSV/XLSX cùng schema 24 cột, cùng normalized output và lỗi ổn định.
4. Migration/import batch/package/line tối thiểu.
5. Commit transaction + idempotency + conflict handling.
6. Đồng bộ controller, OpenAPI và generated client.

Test bắt buộc:
- CSV và XLSX tương đương;
- package nhiều SKU và source_quantity > 1;
- hai package cùng SKU không bị gom;
- field cấp package mâu thuẫn bị chặn;
- PII header/payload bị chặn trước khi lưu;
- retry không tạo trùng; cùng key khác payload trả 409;
- hai shop cùng tracking tạo hai package;
- lỗi giữa transaction không để dữ liệu nửa chừng.

Không làm: live API/OAuth, scan, listing/publish/reservation, ReturnUnit,
inspection, CatalogProduct matching, finance/payment/claims/mobile/ML hoặc
refactor không liên quan. Không chạy db:reset hay lệnh phá dữ liệu.

Hoàn thành khi test liên quan, lint, typecheck, build, OpenAPI client và
git diff --check đều pass.
```
