# REBOX — Kế hoạch cho session triển khai tiếp theo

## 1. Mục tiêu

Hoàn thiện vertical slice Catalog/Kho hàng hoàn đầu tiên theo hướng **backend trước, nối UI ngay sau từng API**:

```text
Seller tạo/sửa listing + thêm ảnh + publish
→ Buyer tìm thấy listing thật
→ Buyer mở được trang chi tiết SSR
```

Session mới không tiếp tục polish các màn finance, wallet, cart hoặc checkout đang dùng dữ liệu mock.

## 2. Trạng thái hiện tại

- Backend mới có hai module nghiệp vụ chạy thật: `identity` và `inventory`.
- API hiện có: actor context, tạo shop, tạo/list/publish listing và xem listing công khai.
- `SellerWorkbench` đã nối API để tạo shop, tạo draft, xem danh sách và publish.
- Trang chi tiết listing có thể đọc API thật, nhưng home/shop/cart/checkout/finance/wallet phần lớn vẫn dùng fixture hoặc dữ liệu hardcode.
- Chưa có API sửa listing, upload ảnh, danh mục, kiểm soát hàng cấm, tìm kiếm hoặc CSV import.

Nguồn cần đọc trước khi sửa:

1. `docs/07-ARCHITECTURE-DECISIONS.md`
2. `docs/04-IMPLEMENTATION-PLAN.md` — Sprint 2
3. `docs/01-TECHNICAL-SPEC.md` — §4.2.1 và §6.2
4. `docs/02-BACKEND-FLOWS.md` — §2
5. `docs/03-FRONTEND-FLOWS.md` — §1.1, §1.2, §2.3, §2.4
6. `docs/06-DANH-MUC-HANG-CAM.md` — §7

## 3. Phạm vi session

### Bước 1 — Audit flow hiện tại

- Đọc schema, `InventoryModule`, controller, OpenAPI client, `SellerWorkbench` và trang listing.
- Tìm toàn bộ caller trước khi đổi contract.
- Chạy test hiện tại để lấy baseline.

Xác minh:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

### Bước 2 — Bổ sung sửa listing draft

- Thêm schema input dùng chung cho update draft.
- Chỉ owner/shop member có capability phù hợp được sửa.
- Chỉ cho sửa listing ở trạng thái `DRAFT`; trạng thái khác trả lỗi domain rõ ràng.
- Không nhận `shopId`, status, price source hoặc ownership từ request body.
- Cập nhật OpenAPI, generate API client rồi mới nối UI.
- Thêm một integration test cho success, invalid state và chống IDOR.

Endpoint dự kiến:

```http
PATCH /v1/shops/{shopId}/listings/{listingId}
```

Xác minh: test backend pass và generated client không lệch OpenAPI.

### Bước 3 — Nối UI chỉnh sửa listing

- Tái sử dụng form listing hiện có; không tạo form thứ hai nếu có thể dùng chung.
- Cho seller mở draft, sửa và lưu lại.
- Có loading, validation, error và success state.
- Giữ nguyên dữ liệu form nếu request lỗi.
- Chưa làm editor cho listing đã publish nếu backend chưa có state transition tương ứng.

Xác minh: thêm E2E `tạo draft → sửa → reload → dữ liệu mới còn nguyên`.

### Bước 4 — Thiết kế contract upload ảnh

- Trước khi code, kiểm tra quyết định storage và giới hạn ảnh trong spec.
- Browser không gửi business mutation trực tiếp vào database.
- API tạo presigned upload intent; client upload file; API complete xác minh key/metadata trước khi gắn vào listing.
- Chỉ áp dụng cho catalog media thông thường; không dùng pipeline này cho dispute evidence.
- Validate MIME, kích thước, số lượng và ownership ở trust boundary.

Endpoint dự kiến, được phép điều chỉnh sau khi audit spec:

```http
POST /v1/shops/{shopId}/listings/{listingId}/images/init
POST /v1/shops/{shopId}/listings/{listingId}/images/complete
DELETE /v1/shops/{shopId}/listings/{listingId}/images/{imageId}
```

Xác minh: test âm cho MIME sai, quá số lượng và actor shop khác. Nếu local storage adapter chưa có, dừng ở contract + fake adapter + test; không hardcode provider production.

### Bước 5 — Buyer catalog/search thật

- Thêm endpoint danh sách listing công khai với cursor, query, category và sort tối thiểu.
- Chỉ trả listing `ACTIVE` thuộc shop `ACTIVE`.
- Không dùng offset pagination.
- Không lộ mã vận đơn hoặc field nội bộ.
- Thay fixture trên home bằng API thật và tạo trang kết quả tìm kiếm.
- UI phải có loading, empty, error và item vừa sold/unavailable.

Endpoint dự kiến:

```http
GET /v1/listings?cursor=&q=&category=&sort=
```

Xác minh:

- Integration test chứng minh draft/hidden listing không xuất hiện.
- E2E chứng minh seller publish xong thì buyer tìm và mở được listing.

## 4. Chỉ làm nếu còn thời gian

- Category picker thay cho nhập `categoryId` tự do.
- Rule chặn `BANNED` và chuyển `MANUAL_REVIEW` theo dữ liệu do Legal sở hữu.
- Hiển thị price source đúng quy tắc; không tự bịa giá gốc hoặc phần trăm giảm.
- Empty state và filter inventory theo trạng thái.

Không đưa CSV import và barcode scan vào cùng diff nếu các bước 1–5 chưa ổn định. Hai phần đó là slice kế tiếp vì cần state machine và test riêng.

## 5. Lộ trình sau khi hoàn thành session này

### Slice kế tiếp — Category policy và CSV bulk import

Đây là ưu tiên tiếp theo, trước barcode và trước các module tài chính.

1. Hoàn thiện category picker và policy hàng hóa:
   - `BANNED` — chặn publish.
   - `MANUAL_REVIEW` — giữ ở trạng thái chờ duyệt.
   - `DISCLOSURE` — bắt buộc seller mô tả tình trạng chi tiết.
2. Nhập CSV Shopee/TikTok:
   - Upload và preview trước khi ghi database.
   - Mapping cột rõ ràng.
   - Validate và báo lỗi theo từng dòng.
   - Dedupe theo định danh nguồn/mã vận đơn phù hợp với kết quả khảo sát nhãn.
3. Bulk edit:
   - Chọn nhiều dòng.
   - Điền nhanh tình trạng, giá và cân nặng.
   - Sửa các dòng lỗi mà không phải upload lại toàn bộ file.
4. Lưu nháp hoặc publish hàng loạt qua API có idempotency.

Vertical slice nghiệm thu:

```text
Seller upload CSV 100 dòng
→ hệ thống validate từng dòng
→ seller sửa các dòng lỗi
→ publish hàng loạt
→ buyer tìm và mở được listing hợp lệ
```

Điều kiện hoàn thành:

- Dòng hợp lệ được tạo đúng; dòng lỗi có mã/lý do cụ thể.
- Upload lại cùng dữ liệu không tạo listing trùng.
- Listing thuộc danh mục cấm không thể publish.
- Lỗi một số dòng không làm mất kết quả chỉnh sửa của các dòng còn lại.
- Có integration test cho parser/dedupe/policy và E2E cho happy path bulk import.

### Slice sau CSV — Barcode intake

- Camera web với `BarcodeDetector` và fallback đã được chọn trong spec.
- Máy quét USB hoạt động như keyboard; không thêm WebUSB nếu không cần.
- Nhập mã thủ công cho nhãn hỏng/mờ.
- Cảnh báo mã trùng và link tới listing đã tồn tại.
- Lịch sử 20 mã vừa quét.
- Lookup dữ liệu local/CSV để điền sẵn form; live Shopee/TikTok API vẫn tắt.
- Sau khi publish thành công, tự quay lại trạng thái quét sau 1,5 giây.

Chỉ bắt đầu barcode sau khi đã có kết quả khảo sát nhãn vật lý ở Sprint 1 việc 1.0; không tự đoán mã đơn hay mã vận đơn là khóa canonical.

### Sau Catalog/Kho hàng hoàn

Thứ tự tiếp theo:

```text
Seller eKYC và trạng thái onboarding
→ Ledger kép + wallet + hold + coverage
→ Nạp/rút và đối soát bằng fake/sandbox
→ Checkout + payment
→ Order + fulfillment
→ Claims Buyer/Seller/Admin
```

Không bắt đầu checkout hoặc nối dữ liệu thật vào màn finance trước khi ledger, hold, reconciliation và các golden test tiền đều pass.

## 6. Không làm trong session này

- Ledger, wallet, hold, finance API.
- Checkout, payment, order và fulfillment.
- Khiếu nại, evidence hoặc admin console.
- Mobile app, AI triage hoặc phân tích SKU.
- Shopee/TikTok live API.
- Voucher, loyalty, paid promotion hoặc multi-seller checkout.
- Refactor hoặc đổi style các màn hình không liên quan.

## 7. Definition of Done

- Migration/schema thay đổi tối thiểu và có strategy cho database sạch.
- Shared schema, backend, controller, OpenAPI, generated client và UI đồng bộ trong cùng thay đổi.
- Mọi mutation kiểm tra authentication, capability, ownership và state transition.
- Có ít nhất một integration test cho logic có nhánh và một E2E cho happy path chính.
- `lint`, `typecheck`, `test`, `build` và test E2E liên quan đều pass.
- Không còn dữ liệu fixture trên luồng home/search vừa triển khai.
- Diff chỉ chạm file liên quan trực tiếp đến slice.

## 8. Prompt mở đầu cho session mới

```text
Đọc docs/10-NEXT-SESSION-PLAN.md và triển khai theo thứ tự trong file.
Bắt đầu bằng audit flow hiện tại và chạy baseline, sau đó làm Bước 2 — sửa listing draft.
Làm theo vertical slice backend → OpenAPI/api-client → UI → integration/E2E test.
Không mở rộng sang finance, checkout, claims, mobile hoặc AI.
Giữ thay đổi nhỏ, kiểm tra mọi caller và báo rõ nếu contract upload ảnh cần một quyết định provider chưa có.
```
