# REBOX — Kế hoạch hoàn thiện MVP synthetic, tạm hoãn payment production

> Cập nhật ngày 07/09/2026 sau khi rà soát code và đối chiếu toàn bộ docs. Kế hoạch này thay thế kế hoạch chỉ tập trung checkout COD trước đó. Mục tiêu là hoàn thiện các luồng GĐ1 còn lại thành một MVP chạy end-to-end bằng dữ liệu synthetic/fake provider, đồng thời hoãn mọi tích hợp chuyển tiền thật cho tới khi các gate pháp lý và nhà cung cấp được đóng.

## 1. Quyết định phạm vi

### 1.1. “Tạm bỏ payment” nghĩa là gì

Tạm hoãn toàn bộ side effect tiền thật và tích hợp tài chính bên ngoài:

- PSP production, VietQR thật và webhook ngân hàng.
- Nạp/rút ký quỹ thật.
- COD remittance và đối soát thật với đơn vị vận chuyển.
- Refund payout thật cho buyer.
- Lưu thẻ hoặc ví điện tử.
- Tự động đánh dấu giao dịch `PAID`, `VERIFIED`, `SETTLED` dựa trên dữ liệu giả.

Không được bỏ các seam nghiệp vụ mà phần còn lại đang phụ thuộc:

- `orders`, `sub_orders`, `sub_order_items` và state machine đơn hàng.
- Reservation package, TTL và chống double-sell.
- `fund_holds`, ledger kép tối thiểu và số dư synthetic để kiểm thử invariant.
- Fee/hold snapshot do backend tính.
- Payment/refund status ở mức contract và record nội bộ.
- Idempotency, outbox và reconciliation seam.

Lý do: nếu bỏ luôn các aggregate trên thì checkout, fulfillment, review eligibility, dispute và refund record đều phải viết lại khi payment được mở. MVP này phải chứng minh được nghiệp vụ, nhưng tuyệt đối không được chuyển tiền thật.

### 1.2. Mode chạy của MVP

MVP dùng mode rõ ràng:

```text
COMMERCE_MODE=SANDBOX
PAYMENT_MODE=DISABLED
FULFILLMENT_MODE=FAKE
EVIDENCE_MODE=FAKE_METADATA
NOTIFICATION_MODE=IN_APP_OR_LOG
```

Nếu project dùng tên biến khác thì giữ một nguồn cấu hình duy nhất, không rải `if (development)` trong nghiệp vụ. Production phải fail closed khi provider/gate chưa được cấu hình; không tự fallback từ provider thật sang fake.

## 2. Baseline hiện tại

### 2.1. Đã hoạt động và phải giữ nguyên

- Supabase email auth, JWT/JWKS guard và actor context.
- Account profile, địa chỉ, notification/privacy preferences và payment overview read-only.
- Seller onboarding, eKYC local/provider adapter, trạng thái KYC và admin manual review có MFA/AAL2.
- Listing thủ công: tạo/sửa draft, upload ảnh, policy gate, publish và public catalog.
- Tìm kiếm PostgreSQL FTS, trang chi tiết SSR, shop profile và verified shop review.
- Import CSV/XLSX: preview, validate, chặn cột PII, commit `ReturnPackage`/`ReturnLine` idempotent.
- Seller inventory đọc được package đã import.
- Giỏ local đã normalize quantity về `1`, deduplicate và chỉ chọn một listing để checkout.
- Transactional outbox và worker polling cơ bản.
- Seller finance UI hiện đọc snapshot demo.

### 2.2. Khoảng trống phải hoàn thiện

| Nhóm | Trạng thái hiện tại | Đích của kế hoạch |
|---|---|---|
| Package-backed listing | Package import xong chưa scan/tạo listing được | Scan hoặc chọn package → đúng một listing nguyên kiện |
| Public package catalog | Payload vẫn theo listing thủ công/condition grade | Disclosure, manifest summary và `availableQuantity` 0/1 đúng package |
| Listing moderation | Có thể sinh `PENDING_REVIEW` nhưng chưa có hàng đợi admin | Admin duyệt/từ chối có audit và idempotency |
| Commerce | Checkout chỉ là preview | Order/reservation/hold synthetic chạy trong transaction |
| Buyer order | `purchase_orders` là read model demo | Đọc từ aggregate canonical và có detail/timeline |
| Funds | Chỉ có `seller_finance_snapshots` | Ledger/hold synthetic cân sổ; chưa có top-up/withdraw thật |
| Fulfillment | Seller chỉ chọn GHN/GHTK trong onboarding | Fake carrier quote/create/label/status, state machine đầy đủ |
| Dispute/refund | Seller route là placeholder | Buyer/seller/admin hoàn tất case; refund chỉ tới trạng thái chờ payout |
| Evidence | Chưa có pipeline | Fake metadata/version/hash, processing record và UI video/file có gate |
| Notification | Mới có preferences | In-app/log delivery từ outbox; email/SMS/Zalo chỉ fake adapter |
| Legal/CSKH/privacy | Chưa có trang và workflow | Artifact versioned, acceptance, ticket và privacy request synthetic |
| Account | Đổi mật khẩu đang sai flow; quên mật khẩu chưa hoạt động | Các luồng auth/account cơ bản pass E2E |
| Documentation | README/CODEBASE/API catalog lệch code | Trạng thái docs khớp implementation |

### 2.3. Những thứ cố ý không làm trong kế hoạch này

- Mobile app và AI triage GĐ3.
- Phân tích hàng hoàn theo SKU GĐ3.
- Live Shopee/TikTok API; nút tiếp tục hiển thị “Sắp có”.
- Multi-package hoặc multi-seller checkout.
- Voucher, loyalty, paid promotion, đa ngôn ngữ, đa tiền tệ.
- Public API ERP.
- Redis/BullMQ, Kubernetes hoặc search engine ngoài PostgreSQL.
- Provider payment/evidence/shipping production khi chưa có hợp đồng và legal gate.

## 3. Định nghĩa hoàn thành toàn kế hoạch

### 3.1. Seller journey

```text
Đăng ký seller synthetic
→ KYC verified hoặc manual review
→ import CSV/XLSX
→ preview và commit package
→ scan/chọn package
→ tạo listing nguyên kiện
→ upload ảnh ngoài kiện và publish
→ admin duyệt nếu policy yêu cầu
→ listing xuất hiện public
→ nhận order sandbox
→ fake carrier tạo shipment/label
→ cập nhật trạng thái giao hàng
→ xem đối soát synthetic
→ phản hồi dispute nếu có
```

### 3.2. Buyer journey

```text
Đăng ký/đăng nhập
→ tìm listing package-backed
→ xem disclosure và bản kê nguồn
→ thêm giỏ quantity 1
→ chọn địa chỉ
→ checkout một package
→ backend reserve package và tạo hold synthetic
→ xác nhận SANDBOX_COD
→ xem order detail/timeline
→ fake delivery hoàn tất
→ đánh giá shop
→ mở dispute, gửi evidence tùy chọn và kháng nghị
```

### 3.3. Admin journey

```text
Đăng nhập staff + AAL2
→ duyệt KYC
→ duyệt listing PENDING_REVIEW
→ xem hàng đợi dispute theo SLA
→ xem evidence derivative/fake metadata
→ nhập quyết định và lý do
→ hệ thống tạo refund obligation nhưng không payout
→ audit trail truy được actor/time/idempotency key
```

### 3.4. Tiêu chí kỹ thuật toàn cục

- Không có đường nào bán hai lần một `ReturnPackage`.
- Public API không lộ tracking, source order/return ref, buyer gốc hoặc internal PII.
- Mọi mutation quan trọng lấy actor từ JWT, kiểm tra ownership/capability và có test IDOR.
- Mọi amount được tính lại ở backend, snapshot config/version và dùng integer VNĐ.
- Mọi ledger transaction synthetic có tổng posting bằng `0`.
- Retry cùng idempotency key trả cùng kết quả; cùng key khác payload trả conflict.
- Worker retry không tạo shipment, hold, notification hoặc transition trùng.
- Không có adapter fake nào được bật ngầm trong production.
- Lint, typecheck, unit/integration test, build và E2E critical journey đều pass trên setup synthetic tái lập được.

## 4. Guardrail bắt buộc

1. Không nhập dữ liệu CCCD, nhãn vận đơn, payment hoặc evidence thật trước A14/Legal go-no-go.
2. Không gọi HTTP provider bên ngoài trong database transaction; transaction chỉ ghi state + outbox.
3. Không tin client về price, fee, quantity, shop, package, address text, actor hoặc trạng thái.
4. Không dùng `purchase_orders` làm aggregate commerce. Nếu giữ làm read model tạm thì phải có owner/sync mechanism và test.
5. Không dùng `seller_finance_snapshots` làm nguồn sự thật khi đã có ledger.
6. Không đánh dấu refund `PAID/VERIFIED` trong sandbox khi không có side effect được xác minh.
7. Không phục vụ evidence gốc cho seller; fake derivative vẫn phải đi qua cùng authorization seam.
8. Video không phải điều kiện để mở dispute; thiếu evidence vẫn nhận case và chuyển admin review.
9. Listing package-backed luôn bán cả kiện, quantity 1; không tạo `ReturnUnit` hoặc form kiểm đếm bên trong.
10. Mọi session chỉ sửa phần cần thiết, để lại ít nhất một runnable check cho logic không tầm thường.

## 5. Thứ tự triển khai

Làm tuần tự theo session dưới đây. Mỗi session phải merge/pass độc lập; không gộp toàn bộ roadmap vào một diff.

### Session A — Cart invariant và E2E deterministic — `COMPLETED`

Đã hoàn thành trong code hiện tại:

- `readCart`/`writeCart` deduplicate và ép quantity `1`.
- Thêm lại cùng listing không tăng quantity.
- Bỏ nút tăng/giảm số lượng.
- Giỏ chỉ chọn một listing để checkout.
- `Mua hàng` và `Mua ngay` truyền đúng một ID.
- Storefront E2E tự tạo listing synthetic thay vì phụ thuộc âm thầm vào fixture cũ.

Không làm lại Session A trừ khi test hồi quy thất bại.

### Session B — Package-backed listing và scan-to-list — `COMPLETED`

#### B1. Migration và domain link

Thêm tối thiểu:

```text
listings.return_package_id TEXT NULL REFERENCES return_packages(id)
UNIQUE (return_package_id) WHERE return_package_id IS NOT NULL
return_packages.reserved_until TIMESTAMPTZ NULL
```

Quy tắc:

- Package thuộc đúng shop mới được gắn listing.
- Một package có tối đa một listing hiện hành ở MVP.
- Package `RESERVED/SOLD/VOID` không được tạo listing mới.
- Không backfill package giả cho listing thủ công không rõ nguồn.
- Listing thủ công tiếp tục tồn tại như flow riêng nhưng không được checkout trong MVP package-backed.

#### B2. Scan/chọn package

Thêm contract và endpoint:

```http
POST /v1/shops/{shopId}/return-packages/scan
Idempotency-Key: <uuid>

{
  "scannedCode": "...",
  "codeType": "ORDER_SN | TRACKING_NO | UNKNOWN",
  "platformHint": "SHOPEE | TIKTOK | null"
}
```

Backend chuẩn hóa mã, HMAC lookup trong phạm vi shop và get-or-create đúng một listing `DRAFT`. Miss trả `SOURCE_MANIFEST_NOT_FOUND`; không tự gọi API sàn hoặc tạo package giả.

UI tối thiểu:

- Ô scan/nhập tay trên web.
- Hiển thị package, manifest lines, disclosure `UNOPENED_UNINSPECTED` và seal status.
- Cho bổ sung cân nặng/kích thước bên ngoài nếu thiếu.
- Retry offline/double submit không tạo listing trùng.
- Sau commit manifest có CTA rõ ràng “Quét hoặc chọn kiện để đăng bán”.

#### B3. Đăng bán hàng loạt và moderation

- Cho chọn nhiều package `AVAILABLE` chưa có listing để tạo draft hàng loạt; mỗi package vẫn thành một listing riêng quantity 1.
- Không bulk-publish qua lỗi: kết quả phải báo theo package/listing.
- Thêm admin queue/detail/decision cho listing `PENDING_REVIEW` với MFA/capability, reason và idempotency.
- Policy snapshot/version và audit không do client gửi.

#### B4. Public package response

Public listing package-backed phải có:

- `availableQuantity: 0 | 1` suy từ package state.
- Disclosure “Kiện chưa mở kiểm tra”.
- Seal status bên ngoài.
- Manifest summary/lines allowlisted.
- Price source và original price/discount chỉ khi nguồn được phép.
- Không serialize tracking, source ref hoặc internal package/line ID.

Test bắt buộc:

- Scan hit/miss, ownership, retry và package state conflict.
- Hai request đồng thời chỉ tạo một listing.
- Batch create trả kết quả từng package và không duplicate.
- Admin listing review yêu cầu AAL2/capability và chống IDOR.
- Public serializer không lộ field riêng tư.
- Listing package status `RESERVED/SOLD` trả `availableQuantity=0`.

### Session C — Commerce aggregate và ledger/hold synthetic — `COMPLETED`

#### C1. Aggregate canonical

Thêm module `commerce` và bảng tối thiểu:

- `orders`.
- `sub_orders`, unique `order_id` cho quan hệ một-một MVP.
- `sub_order_items`, unique `return_package_id`.
- `fund_holds`.
- `ledger_transactions`.
- `ledger_postings`.
- `idempotency_records` nếu pattern hiện có chưa đủ.

Snapshot bắt buộc:

- Item: listing/package ID, title, image, disclosure, seal, manifest summary và giá.
- Shop: ID/display name/status tại thời điểm đặt.
- Address: encrypted snapshot + hash, không chỉ lưu `addressId`.
- Fee: inputs, breakdown, config version/effective time.
- Mode: `SANDBOX`, không giả là production payment.

#### C2. Ledger tối thiểu

Tạo một interface posting duy nhất cho:

- `SANDBOX_BALANCE_SEED` chỉ dùng seed/test.
- `HOLD_CREATE`.
- `HOLD_RELEASE`.
- `HOLD_CAPTURE_SIMULATED` chỉ khi cần đóng order sandbox; không có nghĩa đã thu tiền thật.

Không triển khai top-up, withdrawal, PSP payout hoặc bank reconciliation. Seed cấp số dư synthetic rõ ràng cho shop test.

Test bắt buộc:

- Tổng debit/credit của từng transaction bằng `0`.
- Transaction đã `POSTED` bất biến.
- Available balance không âm.
- Retry không tạo posting/hold thứ hai.
- Hai transaction cạnh tranh không double hold.
- Release/capture chỉ xảy ra một lần.

### Session D — Checkout SANDBOX_COD và lịch sử đơn — `COMPLETED`

#### D1. Checkout init

```http
POST /v1/checkout/init
Idempotency-Key: <uuid>

{
  "items": [{ "listingId": "...", "quantity": 1 }],
  "addressId": "..."
}
```

Trong một transaction theo lock order canonical:

```text
wallet → shop → listing → ReturnPackage → order → sub_order → fund_hold
```

Backend phải re-read dữ liệu, tính fee, tạo snapshot, reserve package/listing trong 30 phút, tạo order/sub-order/item/hold và ghi outbox expiry.

Error tối thiểu:

- `ONE_PACKAGE_PER_CHECKOUT`.
- `MULTI_SELLER_CHECKOUT_NOT_SUPPORTED`.
- `ITEM_BEING_PURCHASED`.
- `ITEM_SOLD`.
- `SHOP_UNAVAILABLE`.
- `ADDRESS_NOT_FOUND`.
- `INSUFFICIENT_SHOP_FUNDS`.
- `IDEMPOTENCY_CONFLICT`.

#### D2. Xác nhận sandbox

Giữ seam tương thích flow canonical:

```http
POST /v1/checkout/{orderId}/pay
Idempotency-Key: <uuid>

{ "method": "SANDBOX_COD" }
```

Endpoint này không gọi PSP/ngân hàng. Tên method phải làm rõ đây là synthetic. Thành công chuyển order/sub-order sang trạng thái đã xác nhận sandbox, package/listing sang `SOLD`, giữ/capture hold theo policy synthetic và ghi outbox.

Production phải từ chối `SANDBOX_COD`; local/test không được trả trạng thái khiến người dùng hiểu là tiền thật đã được thanh toán.

#### D3. UI và order projection

- Checkout bắt buộc đăng nhập và giữ return URL.
- Chọn/tạo địa chỉ từ API hiện có.
- Trước init chỉ hiển thị ước tính; sau init dùng total từ backend.
- Hiển thị countdown reservation.
- Success chỉ sau response backend; sau đó xóa đúng listing khỏi cart.
- `/account/orders` và order detail đọc aggregate/projection canonical.
- Seller có order list/detail cơ bản.
- Review eligibility chuyển sang completed canonical order.

Test bắt buộc:

- Sửa localStorage/request price/quantity không bypass backend.
- Address của buyer khác bị từ chối không lộ dữ liệu.
- Hai browser context mua cùng package chỉ một thành công.
- Retry init/pay không tạo aggregate thứ hai.
- E2E cart và buy-now đều đặt được SANDBOX_COD.

### Session E — Reservation expiry và commerce E2E ổn định — `COMPLETED`

- Worker xử lý reservation hết hạn idempotently.
- Order còn `RESERVED` quá TTL → `EXPIRED`, package/listing available lại và `HOLD_RELEASE`.
- Order đã confirm không bị expiry worker release.
- Dead-letter/retry có thông tin lỗi; unsupported topic không được im lặng coi là thành công.
- E2E tự chuẩn bị package-backed listing synthetic, không phụ thuộc seed tồn tại từ lần chạy trước.
- Thêm test concurrency, clock/deadline và retry worker.

Hoàn thành Session E khi buyer journey tới order success pass ổn định và không có double-sell/double-hold.

### Session F — Fulfillment bằng fake carrier — `COMPLETED`

#### F1. Deep module và adapter

Thêm module `fulfillment` với interface:

- `quote`.
- `createOrder`.
- `getLabel`.
- `getStatus`.
- normalized webhook/poll event.

Chỉ implement `FakeCarrierAdapter`. Không gọi GHN/GHTK production dù onboarding đã cho chọn carrier. Fake adapter phải deterministic theo seed/input, hỗ trợ failure injection trong test và có stable provider key.

#### F2. State machine

Triển khai transition tối thiểu:

```text
CONFIRMED
→ READY_TO_SHIP
→ PICKED_UP
→ IN_TRANSIT
→ DELIVERED
→ COMPLETED
```

Và các nhánh lỗi:

- `CANCELLED_BY_SELLER`.
- `CANCELLED_BY_PICKUP_FAILURE`.
- `DELIVERY_FAILED`/return flow synthetic nếu canonical state machine yêu cầu.

Mọi transition sai phải bị từ chối. Carrier callback lặp không tạo transition/outbox trùng.

#### F3. UI

- Seller xem shipment, tải/in fake label có watermark “SYNTHETIC — NOT FOR SHIPPING”.
- Buyer/seller xem timeline normalized.
- Admin/test có endpoint hoặc fixture an toàn để mô phỏng carrier event; production không expose test mutation.

Test bắt buộc:

- Contract test fake carrier.
- State transition table.
- Same event ID/same hash no-op; same ID/different hash conflict/P0 log.
- Polling bù và webhook path hội tụ cùng state.
- Order completed mở review eligibility.

### Session G — Dispute, evidence sandbox và refund obligation — `COMPLETED`

#### G1. Claims aggregate

Thêm module `claims` và bảng tối thiểu:

- `dispute_cases`.
- `dispute_case_events` append-only.
- `processing_records` và purpose events.
- `dispute_evidences` metadata/version/hash.
- `evidence_derivatives`.
- `refunds`/refund obligations.
- Appeal/remediation fields theo state machine canonical.

#### G2. Buyer/seller flow

- Buyer mở dispute từ eligible order; late claim vẫn nhận và gắn `LATE_CLAIM`.
- Hiển thị hướng dẫn quay trước camera/file picker.
- Video tối đa 90 giây; video là tùy chọn, không phải prerequisite.
- Trước file picker/camera phải tạo processing record hợp lệ.
- Seller phản hồi và upload evidence qua cùng pipeline.
- Seller chỉ thấy derivative/fake-redacted view, không có fallback sang original.
- Buyer có appeal trong window; case chỉ `CLOSED` sau appeal/remediation.

#### G3. Evidence mode

`FAKE_METADATA` chỉ dùng synthetic bytes nhỏ hoặc fixture, nhưng vẫn lưu provider/bucket/key/version/checksum/lock metadata qua adapter interface. Không tuyên bố đây là WORM production. Test authorization và target exact version ngay từ đầu.

#### G4. Admin và refund record

- Queue theo SLA/value/risk rule, không hiển thị AI score.
- Manual resolve yêu cầu reason tối thiểu 30 ký tự và audit actor/time.
- Quyết định tạo refund obligation đúng funder/amount/return requirement.
- Refund dừng ở `APPROVED`, `WAITING_*`, `PAYOUT_READY` hoặc `SELLER_ACTION_REQUIRED`; không chuyển `PAID/VERIFIED` khi payment disabled.
- Partial refund không bắt return và tổng effective refund không vượt buyer payable.

Test bắt buộc:

- Claim không evidence vẫn được nhận.
- Processing record bắt buộc trước upload.
- Seller không đọc original.
- Admin capability/AAL2/IDOR.
- Appeal giữ hold/case mở.
- Concurrent refund không over-refund.
- Không có path sandbox nào tự đánh dấu payout thành công.

### Session H — Account và KYC hardening — `COMPLETED`

#### H1. Account/auth

- Sửa đổi mật khẩu: xác minh current password trước khi update, chỉ có một flow và thông báo đúng kết quả.
- Làm quên mật khẩu/reset qua Supabase Auth.
- Quyết định rõ social login: hoặc implement đúng provider đã cấu hình, hoặc bỏ/disable với nhãn “Sắp có”; không để button inert.
- Terms/privacy trong auth UI phải là link thật tới artifact đang hiệu lực.
- Kiểm tra return URL bằng allowlist path nội bộ, tránh open redirect.

#### H2. Seller onboarding/KYC

- Thêm notice artifact + processing record trước khi xử lý CCCD/selfie.
- Tách lifecycle request/provider event idempotent; fake/provider retry dùng stable key.
- Phone verification phải có trạng thái rõ: fake OTP ở test hoặc ghi “chưa xác minh”; không hiển thị như verified.
- Không để source KYC image tồn tại vô hạn; có retention/delete receipt theo policy test.
- Production KYC vẫn fail closed khi VNPT/business verification credential hoặc Legal policy chưa đủ.

Test bắt buộc:

- Password change success/failure và không đổi trước khi current password hợp lệ.
- Forgot/reset password E2E mock/Supabase local.
- KYC processing record chronology.
- Provider event retry và same-ID/different-hash.
- Source image cleanup/retention worker synthetic.

### Session I — Notification, legal pages, CSKH và privacy request — `COMPLETED`

#### I1. Notification

- Tạo notification record và in-app inbox cho các sự kiện GĐ1 quan trọng.
- Worker dispatch qua adapter; local dùng in-app/log, email/SMS/Zalo dùng fake adapter.
- Preference chỉ áp cho marketing/optional event; security/order/dispute notice bắt buộc không bị tắt.
- Stable notification key chống gửi trùng.

#### I2. Legal artifact và acceptance

Tạo artifact versioned/hash/body bất biến cho tối thiểu:

- Quy chế sàn.
- Chính sách bảo mật.
- Quy trình giải quyết tranh chấp.
- Điều khoản người bán.
- Notice xử lý eKYC/evidence.

Web có route công khai, footer/auth/onboarding link đúng version. Acceptance lưu user/version/time/source; không sửa đè acceptance cũ.

#### I3. CSKH

- Form ticket có category, nội dung, order/case reference tùy chọn và trạng thái.
- Hiển thị hotline/email cấu hình; không hardcode thông tin chưa được Business xác nhận.
- Admin/support queue tối thiểu và audit reply/status.

#### I4. Privacy request

- `POST /privacy/requests`, `GET /privacy/requests/{id}` với ownership.
- Loại request tối thiểu: access/export, correction và deletion/anonymization.
- Step-up auth cho request nhạy cảm.
- Synthetic export và delete/anonymize workflow có exception cho ledger/audit/legal hold.
- Lưu receipt/status/SLA; không hứa xóa bytes đang bị provider lock.

Test bắt buộc:

- Artifact/version/acceptance bất biến.
- Mandatory notification không bị preference tắt.
- Dispatch retry không gửi trùng.
- CSKH ticket IDOR/capability.
- Privacy request ownership, step-up và exception/receipt.

### Session J — Finance projection synthetic và seller UX hoàn chỉnh — `COMPLETED`

- Chuyển seller finance khỏi JSON snapshot demo sang projection từ ledger/order/hold synthetic.
- Tách rõ available, order-locked, withdrawal-pending, unmatched-reserve và debt; bucket chưa dùng vẫn trả `0` với contract ổn định.
- Gắn nhãn rõ “Dữ liệu mô phỏng — không phải số dư có thể rút”.
- Hiển thị listing `HIDDEN_BY_FUND` cùng số tiền synthetic thiếu và CTA giải thích; không mở top-up thật.
- Seller returns route dùng claims thật thay placeholder.
- Seller order/inventory filters phản ánh state canonical.
- Reports/SKU analytics vẫn giữ ngoài phạm vi GĐ3, không dựng dữ liệu giả để làm đẹp UI.

Test bắt buộc:

- Projection khớp ledger theo từng account/bucket.
- Không cộng pending/reserve/debt vào available.
- Coverage hide/unhide deterministic từ số dư synthetic.
- Không có CTA nạp/rút tiền hoạt động khi payment disabled.

### Session K — Docs, security, recovery và release candidate — `COMPLETED`

#### K1. Đồng bộ docs

- Cập nhật `README.md`, `CODEBASE.md`, `docs/09-API-CATALOG.md` và changelog theo implementation thật.
- Mọi endpoint ghi đúng `IMPLEMENTED_LOCAL`, `SANDBOX_ONLY`, `BLOCKED_PROVIDER` hoặc `DEFERRED_GĐ3`.
- Sinh lại OpenAPI types và có contract drift check trong CI.
- Xóa claim “skeleton chưa có source code”.

#### K2. Hardening

- Rà OWASP Top 10, IDOR, upload boundary, SSRF/open redirect và log PII.
- Rate limit theo IP/user/endpoint cho auth, checkout, upload, dispute và admin mutation.
- Security headers, CSP phù hợp, audit log và request correlation.
- Load test synthetic cho catalog, 50 checkout cạnh tranh và worker backlog.

#### K3. Recovery/runbook

- Backup/restore local hoặc staging synthetic; không dùng production data.
- Test replay outbox, idempotency, deletion/anonymization tombstone và active hold.
- Runbook tối thiểu cho database down, worker backlog, provider fake failure, stuck reservation, duplicate event, evidence unavailable, KYC outage và rollback migration.

#### K4. Release candidate

- Chạy 20 đơn synthetic end-to-end.
- Không double-sell, ledger lệch `0`, worker không duplicate side effect.
- Tất cả critical E2E pass ba lần liên tiếp trên database reset/seed sạch.
- UI không có CTA production payment/shipping/evidence hoạt động.
- Nếu deploy staging cần thao tác hạ tầng/tài khoản ngoài repo, phải được user cấp quyền riêng; kế hoạch này không tự suy quyền deploy.

## 6. Dependency graph

```text
Session A completed
  ↓
Session B package-backed listing
  ↓
Session C commerce + synthetic ledger/hold
  ↓
Session D checkout + order projection
  ↓
Session E expiry/concurrency
  ↓
Session F fake fulfillment
  ↓
Session G dispute/evidence/refund record

Session H account/KYC hardening ─┐
Session I legal/CSKH/privacy ────┼→ Session K release candidate
Session J finance/seller UX ─────┘
```

Không bắt đầu Session D trước khi C pass ledger/hold/concurrency. Không bắt đầu refund/dispute financial obligation trước khi order snapshot và buyer payable ở D ổn định.

## 7. File/module dự kiến

Chỉ tạo file khi session thực sự cần; kiểm tra helper/pattern có sẵn trước.

| Phạm vi | Vị trí chính |
|---|---|
| Domain contracts/errors | `packages/shared/src/` |
| OpenAPI/generated client | `packages/api-client/openapi/rebox.yaml`, `packages/api-client/src/` |
| Database schema/migrations | `packages/backend/src/platform/database/schema.ts`, `db/migrations/` |
| Inventory/scan/moderation | `packages/backend/src/modules/inventory/`, `apps/api/src/http/controllers/`, seller/admin web |
| Commerce/ledger/hold | `packages/backend/src/modules/commerce/`, module funds seam nếu cần |
| Fulfillment | `packages/backend/src/modules/fulfillment/`, worker + fake adapter |
| Claims/evidence/refund | `packages/backend/src/modules/claims/`, buyer/seller/admin web |
| Notifications/legal/privacy | backend modules/controllers, worker handlers và public/account/admin routes |
| Web | `apps/web/src/app/`, `apps/web/src/features/` |
| API wiring | `apps/api/src/app.module.ts`, `apps/api/src/backend.providers.ts` |
| Worker | `apps/worker/src/`, `packages/backend/src/platform/outbox/` |
| Tests | `packages/shared/test/`, `packages/backend/test/`, `apps/api/test/`, `apps/web/e2e/` |

Không tạo interface có một implementation nếu seam không cần cho provider/concurrency test. Các seam fake/production như carrier, evidence và notification là ngoại lệ hợp lệ vì production provider sẽ được gắn sau gate.

## 8. Ma trận test tối thiểu toàn MVP

| Nhóm | Trường hợp bắt buộc |
|---|---|
| Inventory | scan hit/miss; HMAC lookup; ownership; one package-one listing; public serializer không PII |
| Moderation | banned/manual-review/disclosure; AAL2; reason; idempotency; audit |
| Cart/checkout | quantity tamper; one package; address IDOR; server-side fee; retry; two buyers concurrent |
| Ledger/hold | balanced posting; immutable posted transaction; non-negative; create/release/capture once |
| Worker | retry; crash/resume; duplicate event; same-ID/different-hash; dead-letter |
| Fulfillment | valid/invalid transition; webhook/poll convergence; fake label watermark |
| Claims | late/no-evidence claim; processing record; seller derivative-only; appeal; SLA |
| Refund record | no over-refund; partial no-return; payment-disabled không thành PAID |
| Account/KYC | password reset/change; provider retry; image cleanup; admin capability |
| Legal/privacy | artifact immutable; acceptance version; step-up; export/delete exception/receipt |
| Notifications | mandatory vs optional preference; dedupe; adapter failure/retry |
| End-to-end | seller import→listing; buyer buy→delivery→review; dispute→admin→refund pending |

## 9. Lệnh kiểm tra sau mỗi session

Trước integration/E2E, chạy đúng local synthetic stack:

```bash
git status --short
corepack pnpm db:start
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
git diff --check
```

Không tự chạy `db:reset` khi chưa xác nhận database chỉ chứa fixture bỏ được. Khi cần clean run:

```bash
corepack pnpm db:reset
```

Chỉ chạy lệnh trên với Supabase local synthetic đã xác nhận đúng target.

Mỗi session phải ghi trong handoff:

- File đã đổi và trách nhiệm từng file.
- Migration đã chạy hay chưa.
- Test nào pass/fail/skipped và nguyên nhân.
- Invariant nào được chứng minh.
- Scope nào vẫn deferred/blocked.
- Session tiếp theo bắt đầu ở đâu.

## 10. Gate trước khi gọi là production-ready

Hoàn thành roadmap này chỉ tạo **MVP synthetic/sandbox**, chưa phải production marketplace. Trước production vẫn phải đóng:

| Gate | Điều kiện |
|---|---|
| A10 Payment | PSP/custody/top-up/refund/payout/withdrawal được Business + Legal duyệt và contract test đạt |
| A12 Evidence | WORM provider/version/Object Lock/legal hold/delete/watchdog được duyệt |
| A14 Data | DPA/subprocessor/region/backup/data-transfer và Legal go-no-go cho dữ liệu thật |
| Legal TMĐT | Hồ sơ sàn, quy chế/chính sách hiện hành và checklist nghĩa vụ được Legal ký |
| Legal catalog | Danh mục cấm/hạn chế có version được Legal phê duyệt |
| Physical label | Khảo sát 20–30 kiện thật và test matrix mã vận đơn/PII label |
| Carrier | Hợp đồng, beneficiary, label, webhook/poll, COD gross/net/deduction được xác nhận |

Không blocker nào cho phép bật tiền thật, dữ liệu thật hoặc provider thật bằng giả định.

## 11. Handoff hoàn thành

Hoàn thành ngày 07/09/2026 ở phạm vi synthetic/sandbox:

- Migration `0013`–`0015` đã chạy thành công từ Supabase local reset sạch; seed chỉ chứa fixture synthetic.
- `86/86` unit/integration test pass, gồm 20 đơn release candidate, 50 checkout cạnh tranh, ledger cân bằng/bất biến, expiry, fake carrier, claims, legal/support/privacy và notification dedupe.
- `27/27` Playwright E2E pass ba lượt liên tiếp; mỗi lượt đều reset → migrate → seed sạch và cart/buy-now đều tạo đơn package-backed `SANDBOX_COD` thật qua API.
- `lint`, `typecheck`, `build` và OpenAPI generation pass; payment/provider production tiếp tục fail closed và vẫn thuộc các gate ở mục 10.
