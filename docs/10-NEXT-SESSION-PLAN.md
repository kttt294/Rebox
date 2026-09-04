# REBOX — Kế hoạch cho session triển khai tiếp theo

> Cập nhật sau session ngày 04/09/2026.

## 1. Mục tiêu session kế tiếp

Triển khai vertical slice **CSV import + bulk edit** sau khi flow catalog thủ công đã ổn định:

```text
Seller upload CSV synthetic
→ preview và validate từng dòng
→ sửa dòng lỗi
→ tạo draft idempotent
→ publish qua policy gate hiện có
→ buyer chỉ thấy listing hợp lệ
```

Không mở rộng sang barcode, API Shopee/TikTok thật, finance, checkout hoặc claims trong cùng diff.

## 2. Trạng thái hiện tại

Các flow Catalog/Kho hàng hoàn đang chạy thật trên local:

- Backend có `identity` và `inventory`; mọi mutation kiểm tra JWT, capability, ownership và listing state.
- Seller có thể tạo, sửa draft, upload tối đa 6 ảnh và publish.
- Ảnh catalog dùng presigned upload; backend xác minh namespace và metadata authoritative trước khi gắn vào draft.
- Buyer catalog/search dùng PostgreSQL FTS, cursor pagination và chỉ trả listing `ACTIVE` của shop `ACTIVE`.
- Trang chi tiết SSR, product card và ảnh catalog đọc dữ liệu backend thật.
- `SellerWorkbench` dùng category picker từ `GET /v1/categories`; không còn input `categoryId` tự do.
- Publish được backend áp policy `BANNED`, `MANUAL_REVIEW`, `DISCLOSURE`; client không được gửi kết quả moderation.
- OpenAPI, generated API client, shared schemas, controller, backend và UI đang đồng bộ.

Home/search/listing detail đã dùng catalog thật. Finance, wallet, cart/checkout ngoài catalog và các module sau vẫn còn fixture hoặc chưa triển khai.

Nguồn cần đọc trước session mới:

1. `docs/07-ARCHITECTURE-DECISIONS.md`
2. `docs/04-IMPLEMENTATION-PLAN.md` — Sprint 2
3. `docs/01-TECHNICAL-SPEC.md` — catalog ingest, listing state machine
4. `docs/02-BACKEND-FLOWS.md` — CSV/manual ingest và publish
5. `docs/03-FRONTEND-FLOWS.md` — seller inventory/bulk edit
6. `docs/06-DANH-MUC-HANG-CAM.md`
7. `docs/09-API-CATALOG.md`

## 3. Đã hoàn thành trong session 04/09/2026

### 3.1. Audit và baseline

- Đã kiểm tra Git status và giữ nguyên các thay đổi chưa commit có sẵn.
- Đã audit schema, migrations, seed, `InventoryModule`, controller, shared contracts, OpenAPI/client, `SellerWorkbench` và toàn bộ caller create/update/publish.
- Baseline trước category policy: lint, typecheck, build pass; Vitest 24/24 pass.

### 3.2. Database và seed policy

- Thêm migration `db/migrations/0003_pretty_jean_grey.sql`.
- Thêm bảng `categories` và `restricted_categories`.
- Thêm foreign key từ `listings.category_id` sang category.
- Thêm `applied_policy_version`, `applied_policy_snapshot`, `policy_evaluated_at` để audit quyết định publish.
- Migration backfill category cũ thành inactive trước khi thêm foreign key, tránh phá dữ liệu đã có.
- Seed category/policy synthetic từ `docs/06-DANH-MUC-HANG-CAM.md`.
- Seed đã chạy lặp lại hai lần thành công để xác nhận idempotent.

### 3.3. Shared contract và API

- Thêm shared schemas/types cho `Category`, `ListingPolicyResult` và `PublishListingResult`.
- Thêm public endpoint `GET /v1/categories`.
- Endpoint chỉ trả `{id, name}` của category active và không bị policy `BANNED` đang hiệu lực.
- Không trả policy/version trong category picker và không nhận field moderation từ create/update request.
- Đã cập nhật OpenAPI và regenerate `packages/api-client/src/generated.ts`.

### 3.4. Backend policy enforcement

Policy được giữ trong `InventoryModule`, không tạo module/abstraction mới:

| Policy | Kết quả publish | Outbox |
|---|---|---|
| `BANNED` | Lỗi `LISTING_CATEGORY_BANNED`, giữ `DRAFT` | Không phát event |
| `MANUAL_REVIEW` | `DRAFT → PENDING_REVIEW` | `listing.pending_review` |
| `DISCLOSURE` thiếu khai báo | Lỗi `LISTING_DISCLOSURE_REQUIRED`, giữ `DRAFT` | Không phát event |
| Không hạn chế hoặc disclosure hợp lệ | `DRAFT → ACTIVE` | `listing.published` |

- Create/update từ chối category không tồn tại hoặc inactive bằng `INVALID_CATEGORY`.
- Publish khóa listing draft trong transaction rồi lấy policy đang hiệu lực theo `effective_from/effective_to`.
- Policy version và rule snapshot được lưu cả khi publish thành công, chuyển review hoặc bị policy từ chối.
- Policy hết hiệu lực không được áp dụng.
- Worker chấp nhận cả `listing.published` và `listing.pending_review`.
- Storefront vẫn chỉ query listing/shop `ACTIVE`, nên draft và pending review không lộ qua search/detail.

### 3.5. Seller UI

- Thay input category ID tự do bằng native `<select>` lấy dữ liệu backend.
- Có loading, empty, error, retry và validation state cho category picker.
- Tái sử dụng form create/edit hiện có.
- Request lỗi giữ nguyên dữ liệu form.
- Có thông báo riêng cho invalid category, BANNED, MANUAL_REVIEW và DISCLOSURE.
- Listing `PENDING_REVIEW` không có nút sửa/publish lại và không có link “Xem công khai”.

### 3.6. Verification cuối session

```text
lint                  PASS
typecheck             PASS
Vitest                31/31 PASS
production build      PASS
Playwright E2E        7/7 PASS
git diff --check      PASS
seed idempotency      PASS
```

E2E đã phủ seller chọn category → tạo/sửa draft → upload ảnh → publish → `PENDING_REVIEW`. Integration test phủ invalid category, BANNED, MANUAL_REVIEW, DISCLOSURE, policy hết hạn, ownership/IDOR và outbox.

Không chạy `db:reset` vì thao tác này xóa dữ liệu local hiện có; migration upgrade và seed đã được áp dụng thành công lên Supabase local.

## 4. Quyết định nghiệp vụ còn mở

- `docs/06-DANH-MUC-HANG-CAM.md` vừa mặc định rượu là `BANNED`, vừa ghi chờ Legal quyết.
- Dev seed hiện dùng `MANUAL_REVIEW` và `legalDecisionPending=true` để fail-safe, không tự coi là BANNED production.
- Category `BANNED` bị ẩn khỏi picker nhưng backend vẫn kiểm tra để chặn stale draft hoặc caller gọi API trực tiếp.
- Policy seed là dữ liệu dev/test synthetic; không được coi là Legal approval cho production.

## 5. Slice kế tiếp — CSV import và bulk edit

### Bước 1 — Audit contract ingest

- Kiểm tra định dạng CSV dự kiến, allowlist field và kết quả khảo sát nhãn vật lý.
- Không lưu buyer name, phone, address, recipient hoặc raw payload chứa PII.
- Tái sử dụng create/update/publish và category policy hiện có; không viết đường bypass riêng cho bulk.
- Chốt khóa dedupe từ dữ liệu thực sự có; không tự đoán mã đơn/mã vận đơn là canonical.

### Bước 2 — Parse và preview

- Ưu tiên parser tối thiểu hoặc dependency đã có; không thêm thư viện nếu chưa cần.
- Upload và parse trước, chưa ghi database ngay.
- Mapping cột rõ ràng; validate từng dòng bằng shared schema.
- Response trả row index, normalized draft và danh sách lỗi ổn định.
- Có giới hạn số dòng/kích thước file tại trust boundary.

### Bước 3 — Bulk edit và commit idempotent

- Seller sửa category, condition, notes, price và weight cho các dòng lỗi.
- Lỗi một dòng không làm mất chỉnh sửa các dòng khác.
- Commit tạo draft idempotent; retry không tạo listing trùng.
- Publish hàng loạt gọi chung policy enforcement hiện có.
- Kết quả phân biệt `DRAFT`, `PENDING_REVIEW`, `ACTIVE` và lỗi policy theo từng dòng.

### Bước 4 — UI và test

- Preview table có loading, empty, validation và retry state.
- Integration test parser, PII allowlist, dedupe, partial failure và policy.
- E2E happy path: CSV synthetic → sửa dòng → tạo draft → publish → buyer tìm thấy listing hợp lệ.

Điều kiện hoàn thành:

- Dòng hợp lệ được tạo đúng; dòng lỗi có code/lý do cụ thể.
- Upload lại cùng dữ liệu không tạo listing trùng.
- Listing thuộc category cấm không thể publish qua bulk API.
- Không có buyer PII trong database, log hoặc error response.
- `lint`, `typecheck`, `test`, `build` và E2E liên quan đều pass.

## 6. Slice sau CSV — Barcode intake

- Camera web dùng `BarcodeDetector` với fallback theo spec.
- Máy quét USB hoạt động như keyboard; không thêm WebUSB nếu không cần.
- Cho nhập mã thủ công khi nhãn hỏng/mờ.
- Cảnh báo mã trùng và link tới listing đã tồn tại.
- Giữ lịch sử 20 mã vừa quét.
- Lookup dữ liệu local/CSV để điền form; live Shopee/TikTok API vẫn tắt.

Chỉ bắt đầu barcode sau khi có kết quả khảo sát nhãn vật lý Sprint 1; không tự đoán định danh nguồn.

## 7. Sau Catalog/Kho hàng hoàn

```text
Seller eKYC và onboarding
→ Ledger kép + wallet + hold + coverage
→ Nạp/rút và đối soát fake/sandbox
→ Checkout + payment
→ Order + fulfillment
→ Claims Buyer/Seller/Admin
```

Không nối dữ liệu thật vào finance hoặc bắt đầu checkout trước khi ledger, hold, reconciliation và golden test tiền đều pass.

## 8. Không làm trong session CSV

- Barcode scan.
- Shopee/TikTok live API.
- Ledger, wallet, finance, checkout, order hoặc claims.
- Mobile app hoặc ML moderation.
- Refactor UI không liên quan.
- CSV import chứa dữ liệu người dùng thật.

## 9. Prompt mở đầu cho session mới

```text
Đọc docs/10-NEXT-SESSION-PLAN.md và triển khai vertical slice CSV import + bulk edit.
Bắt đầu bằng audit contract ingest, dữ liệu nhãn thực tế và toàn bộ caller create/update/publish.
Tái sử dụng shared listing schemas, InventoryModule và category policy hiện có; không tạo đường bulk bypass policy.
Chặn PII tại ingest, preview trước khi ghi database và đảm bảo retry idempotent.
Làm theo thứ tự schema/contract → backend → controller → OpenAPI/client → SellerWorkbench → integration/E2E.
Không mở rộng sang barcode, finance, checkout, claims, mobile, ML hoặc API Shopee/TikTok thật.
```
