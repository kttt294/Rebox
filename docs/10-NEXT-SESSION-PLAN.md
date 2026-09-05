# REBOX — Kế hoạch session tiếp theo: hoàn tất KYC thủ công

> Cập nhật ngày 05/09/2026. Luồng import CSV/XLSX đã có trong codebase, vì vậy session tiếp theo không làm lại phần đó. Chỉ triển khai vertical slice **seller xem trạng thái KYC → admin duyệt thủ công → seller được phép hoặc bị chặn publish**.

## 1. Trạng thái hiện tại

Đã có:

- Seller onboarding: upload CCCD mặt trước/sau, selfie, nhập MST và tài khoản ngân hàng.
- Backend gọi VNPT qua `KycProvider` cho OCR, document validation, face match và liveness.
- Backend tự xử lý MST/ngân hàng qua `BusinessVerificationProvider`.
- API hiện hành:
  - `POST /v1/kyc/start`
  - `POST /v1/kyc/document/front`
  - `POST /v1/kyc/document/back`
  - `POST /v1/kyc/selfie`
  - `POST /v1/kyc/tax`
  - `POST /v1/kyc/bank`
  - `GET /v1/kyc/{kycId}/status`
- Trạng thái KYC: `PENDING | PROCESSING | VERIFIED | REJECTED | MANUAL_REVIEW`.
- Publish listing đã bị chặn bằng `SHOP_NOT_VERIFIED` nếu shop chưa `VERIFIED`.
- Khi URL xác minh MST/ngân hàng chưa cấu hình, provider trả `UNAVAILABLE` và hồ sơ chuyển sang `MANUAL_REVIEW`.
- Seller Center mới chỉ hiển thị nhãn trạng thái tổng quát; chưa có trang chi tiết, lý do hoặc hành động tiếp theo.

Khoảng trống cần xử lý:

- Chưa có quyền `platform_staff_roles` trong schema/runtime.
- Chưa có API và web admin cho hàng đợi KYC.
- Chưa lưu quyết định, người duyệt, thời điểm và lý do duyệt.
- Seller chưa xem được lý do từ chối hoặc hành động tiếp theo.
- MST/tài khoản ngân hàng chưa được xác minh thật khi provider trả `UNAVAILABLE`.

## 2. Mục tiêu session

```text
Seller hoàn thành onboarding
→ hồ sơ rơi vào MANUAL_REVIEW
→ admin AAL2 mở hàng đợi
→ xem dữ liệu đã normalize và kết quả kiểm tra
→ APPROVE hoặc REJECT kèm lý do
→ cập nhật seller_kyc + shops trong một transaction
→ seller thấy kết quả
→ chỉ shop VERIFIED được publish
```

Đây là luồng duyệt onboarding tối thiểu. **Không tích hợp PayOS, payout hoặc Account Lookup trong session này.**

## 3. Quy tắc nghiệp vụ phải giữ

- `VERIFIED` trong slice này nghĩa là seller được duyệt định danh/onboarding để đăng bán.
- Admin approve khi bank/MST provider `UNAVAILABLE` **không được** đổi `seller_bank_accounts.verified` hoặc `seller_tax_info.verified` thành `true`.
- Tài khoản ngân hàng chưa xác minh không được coi là đủ điều kiện payout. Payout chưa triển khai và tiếp tục để ngoài phạm vi cho tới khi A10/pháp lý/đối tác được chốt.
- `REJECTED` là quyết định cuối của lần KYC hiện tại. Seller được xem lý do; việc tạo attempt KYC mới để nộp lại toàn bộ để ở phần sau, không reset/ghi đè hồ sơ cũ trong session này.
- `PROCESSING` chỉ dành cho hồ sơ còn thiếu bước hoặc provider đang xử lý; không dùng thay cho `MANUAL_REVIEW`.
- Không expose raw response của VNPT cho frontend hoặc admin.
- Không trả CCCD, selfie, số tài khoản hay MST ở API danh sách.
- Dữ liệu nhạy cảm chỉ được giải mã ở API chi tiết sau khi đã kiểm tra staff role và AAL2.
- Không dùng self-declared `accountHolder` để kết luận tài khoản ngân hàng đã xác minh.
- Mọi quyết định duyệt phải có lý do, actor và timestamp; không có đường tắt bằng update DB từ frontend.

## 4. Bước 1 — Quyền admin tối thiểu

- Thêm `platform_staff_roles` theo quyết định canonical hiện có:
  - `user_id`
  - `role`: `SUPPORT | MODERATOR | DISPUTE_ARBITRATOR | SUPER_ADMIN`
  - `status`: `ACTIVE | INACTIVE`
  - `created_at`
  - primary key `(user_id, role)`
- Trong slice này, chỉ `MODERATOR` và `SUPER_ADMIN` được duyệt KYC.
- Thêm guard/decorator nhỏ nhất để kiểm tra quyền từ database; không tin role do frontend gửi lên.
- Endpoint xem/duyệt dữ liệu KYC yêu cầu JWT hợp lệ và AAL2. Local/test seed một staff account; không xây màn quản trị nhân sự.
- Trả `404` cho hồ sơ không tồn tại; trả `403` cho user đã đăng nhập nhưng không có quyền. Không để seller suy đoán dữ liệu KYC của người khác.

**Kiểm tra:** seller thường không gọi được admin API; staff inactive không gọi được; moderator/super admin AAL2 gọi được; token không AAL2 bị chặn.

## 5. Bước 2 — Lưu quyết định manual review

Thêm migration tối thiểu:

```text
seller_kyc_reviews
- id
- kyc_id
- reviewer_id
- decision        APPROVE | REJECT
- reason
- idempotency_key
- request_hash
- created_at
```

- Bảng review là append-only để không mất lịch sử; không sửa đè quyết định.
- Unique theo `kyc_id` cho lần KYC hiện tại và `(reviewer_id, idempotency_key)` để xử lý retry.
- `reason` bắt buộc, trim, giới hạn độ dài hợp lý.
- Chỉ cho quyết định khi `seller_kyc.status = MANUAL_REVIEW`.
- Trong cùng một transaction:
  1. lock hồ sơ KYC;
  2. xác nhận vẫn là `MANUAL_REVIEW`;
  3. insert review event;
  4. đổi `seller_kyc.status` và `shops.kyc_status` sang `VERIFIED` hoặc `REJECTED`;
  5. set/clear `verified_at` và `kyc_verified_at` nhất quán.
- Retry cùng idempotency key và cùng payload trả cùng kết quả; cùng key khác payload trả `409`.
- Hai admin duyệt đồng thời chỉ có một quyết định thắng; request còn lại trả conflict, không tạo hai kết quả trái nhau.
- Approve onboarding không sửa cờ `verified` của bank/MST nếu provider chưa xác minh thật.

**Kiểm tra:** transaction rollback không để review/status nửa chừng; concurrent review không tạo hai quyết định; bank/MST `UNAVAILABLE` vẫn giữ `verified = false` sau khi onboarding được approve.

## 6. Bước 3 — API admin và response nội bộ

Thêm đúng ba endpoint:

```text
GET  /v1/admin/kyc?status=MANUAL_REVIEW&cursor=...
GET  /v1/admin/kyc/{kycId}
POST /v1/admin/kyc/{kycId}/decision
     Idempotency-Key: <uuid>
     { "decision": "APPROVE" | "REJECT", "reason": "..." }
```

Danh sách chỉ trả dữ liệu vận hành tối thiểu:

```ts
type AdminKycQueueItem = {
  kycId: string;
  shopId: string;
  shopDisplayName: string;
  status: "MANUAL_REVIEW";
  provider: string;
  submittedAt: string;
};
```

Chi tiết trả schema nội bộ đã normalize:

- Identity OCR: số CCCD masked, họ tên, ngày sinh, giới tính, địa chỉ, ngày cấp.
- Verification: document valid, face matched/score, liveness passed/score.
- MST: trạng thái provider và tên đăng ký nếu có.
- Bank: bank code, số tài khoản masked, trạng thái provider, tên trả về nếu có, name match score.
- Không có raw VNPT payload, token, object key hoặc public image URL.

Trong session này chưa làm viewer ảnh CCCD/selfie. Nếu vận hành thực tế chứng minh admin bắt buộc phải xem ảnh, làm endpoint signed URL ngắn hạn ở session riêng với AAL2, reason và audit access.

**Kiểm tra:** OpenAPI/generated client đồng bộ; queue không chứa PII; detail chỉ mở sau authorization; decision validate strict body và idempotency key.

## 7. Bước 4 — UI seller và admin

### Seller

- Bổ sung `kycId` nullable vào shop summary trả bởi `GET /v1/me`, để Seller Center có thể gọi `GET /v1/kyc/{kycId}/status` sau khi reload; không lưu ID này vào localStorage.
- Mở rộng `KycStatusResponse` bằng `review: { reason, reviewedAt } | null`; không trả `reviewerId` cho seller.
- Từ Seller Center, trạng thái KYC dẫn tới một khối/trang chi tiết dùng endpoint status hiện có.
- Hiển thị rõ:
  - `PROCESSING`: hồ sơ đang xử lý hoặc còn thiếu bước;
  - `MANUAL_REVIEW`: hồ sơ đang chờ nhân viên duyệt;
  - `VERIFIED`: được phép đăng bán;
  - `REJECTED`: hiển thị lý do từ chối và hướng dẫn liên hệ hỗ trợ.
- Không hiển thị điểm số kỹ thuật cho seller nếu nó không giúp họ thực hiện hành động tiếp theo.
- Giữ chặn publish hiện có; chỉ bổ sung test để tránh regression.

### Admin

- Thêm route web tối thiểu `/admin/kyc` trong app Next.js hiện có; không tạo app admin riêng.
- Mặc định chỉ liệt kê `MANUAL_REVIEW`, sắp xếp cũ nhất trước.
- Admin mở chi tiết, xem dữ liệu normalize, chọn `Approve` hoặc `Reject` và bắt buộc nhập lý do.
- Disable submit khi đang gửi; sau thành công loại hồ sơ khỏi queue và hiển thị kết quả.
- Không có bulk approve, auto-approve, AI suggestion, dashboard thống kê hoặc cấu hình rule.

**Kiểm tra:** E2E seller thấy đúng trạng thái/lý do; E2E admin duyệt một hồ sơ; double-click không tạo hai quyết định; user không có quyền không thấy dữ liệu admin.

## 8. Ngoài phạm vi session này

- PayOS, thanh toán, payout, ví, QR nhận tiền hoặc liên kết trực tiếp với ngân hàng.
- Account Lookup thật và xác minh tên chủ tài khoản.
- Xác minh MST thật nếu chưa chọn data provider.
- Gắn `verified = true` cho bank/MST dựa trên dữ liệu seller tự nhập.
- VNPT IDCheck/chip CCCD/RAR-C06.
- Tạo attempt KYC mới sau một quyết định `REJECTED`.
- Viewer ảnh CCCD/selfie hoặc public URL cho ảnh KYC.
- Live API/OAuth Shopee/TikTok.
- Scan mã vận đơn, tạo listing mới từ package hoặc refactor luồng import đã có.
- AI review, bulk action, notification service hoặc dashboard admin.

## 9. Điều kiện hoàn thành

- `platform_staff_roles` tồn tại và admin API kiểm tra role + AAL2 ở backend.
- Queue chỉ trả metadata không nhạy cảm; detail trả dữ liệu normalize, không raw provider response.
- Approve/reject atomic, idempotent và có immutable review event gồm actor, reason, timestamp.
- `seller_kyc.status` và `shops.kyc_status` luôn đồng bộ.
- Approve onboarding không giả mạo trạng thái bank/MST đã xác minh.
- Seller thấy `PROCESSING`, `MANUAL_REVIEW`, `VERIFIED`, `REJECTED` và lý do phù hợp.
- Chỉ shop `VERIFIED` publish được; test regression cho `SHOP_NOT_VERIFIED` vẫn pass.
- Migration chạy trên database test sạch.
- Unit/integration/E2E liên quan, lint, typecheck, build, OpenAPI generated client và `git diff --check` đều pass.

## 10. Việc tiếp theo sau khi hoàn thành session này

Làm vertical slice:

```text
Seller quét mã vận đơn
→ backend normalize + HMAC tracking
→ lookup ReturnPackage đã commit trong phạm vi shop/platform
→ tạo hoặc mở listing draft gắn với đúng package
→ seller hoàn thiện thông tin và publish
```

Scan chỉ lookup dữ liệu local đã import, không tự gọi Shopee/TikTok và không lưu raw tracking ở client.

## 11. Prompt dùng để bắt đầu session mới

```text
Làm việc trong repo /Users/minhsang/Rebox.

Mục tiêu: triển khai đúng vertical slice KYC manual review trong
docs/10-NEXT-SESSION-PLAN.md. Không làm payment, payout, Account Lookup,
scan mã vận đơn hoặc tính năng ngoài phạm vi.

Trước khi sửa:
1. Chạy git status và giữ nguyên mọi thay đổi hiện có.
2. Đọc CONTEXT.md; docs/01-TECHNICAL-SPEC.md phần platform_staff_roles;
   docs/07-ARCHITECTURE-DECISIONS.md phần authorization/A10;
   docs/10-NEXT-SESSION-PLAN.md.
3. Đọc KycModule, KycController, shared KYC contracts, database schema,
   SupabaseJwtGuard, OpenAPI/generated client và seller UI hiện có.
4. Xác nhận publish đã chặn shop chưa VERIFIED; không viết lại logic đã có.
5. Nêu kế hoạch ngắn kèm cách kiểm tra từng bước.

Thực hiện diff nhỏ nhất:
1. Thêm platform_staff_roles + backend authorization cho MODERATOR/SUPER_ADMIN
   và AAL2; không tin role từ frontend.
2. Thêm seller_kyc_reviews append-only và transaction approve/reject idempotent.
3. Thêm queue/detail/decision API dưới /v1/admin/kyc.
4. Queue không chứa PII; detail chỉ trả schema normalize, không raw VNPT/object key.
5. Thêm UI /admin/kyc và phần trạng thái/lý do cho seller.
6. Cho shop summary trả kycId nullable và KycStatusResponse trả review reason/time.
7. Đồng bộ schema shared, OpenAPI và generated client.

Quy tắc bắt buộc:
- Chỉ MANUAL_REVIEW được approve/reject.
- Decision luôn có reason, reviewer và timestamp.
- seller_kyc + shops đổi trạng thái trong cùng transaction.
- Hai reviewer đồng thời không thể tạo hai kết quả trái nhau.
- Approve onboarding không đổi bank/MST verified=true khi provider UNAVAILABLE.
- Không expose CCCD/selfie, raw provider response hoặc số tài khoản đầy đủ.
- REJECTED chỉ hiển thị lý do; chưa xây attempt nộp lại trong session này.

Test tối thiểu:
- seller/non-staff/inactive staff/AAL1 bị chặn khỏi admin API;
- moderator hoặc super admin AAL2 truy cập được;
- approve và reject tạo immutable review event;
- retry cùng idempotency key không tạo trùng, payload khác trả 409;
- concurrent review chỉ một request thắng;
- rollback không để trạng thái nửa chừng;
- bank/MST UNAVAILABLE vẫn verified=false sau approve;
- seller thấy trạng thái/lý do đúng;
- shop chưa VERIFIED vẫn không publish được.

Hoàn thành khi migration test sạch, test liên quan, lint, typecheck, build,
OpenAPI generated client và git diff --check đều pass.
```
