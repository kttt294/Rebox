# REBOX — Quyết định kiến trúc trước khi viết code

Phiên bản: 1.2
Ngày cập nhật: 2026-09-04
Trạng thái: **Canonical cho MVP**

Tài liệu này là nguồn chuẩn cho các quyết định kiến trúc và phạm vi MVP. Khi một mô tả trong `00`–`06`, `CODEBASE.md`, prototype hoặc tài liệu nguồn mâu thuẫn với file này thì **file này được ưu tiên**. Riêng nhận định pháp lý trong `05-PHAP-LY-VIET-NAM.md` vẫn phải được luật sư rà soát trước khi vận hành thật.

## 1. Cách đọc trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `ACCEPTED` | Đã chốt, được dùng để thiết kế schema, interface và test |
| `PROPOSED` | Đã có thiết kế để review; chưa được tạo migration/backend cho tới khi chủ dự án duyệt |
| `BLOCKED` | Chưa đủ căn cứ để chốt; không được triển khai production phần phụ thuộc |
| `DEFERRED` | Không thuộc MVP; chỉ mở lại khi đạt điều kiện kích hoạt |

Không tạo abstraction hoặc dependency chỉ để phục vụ một quyết định `DEFERRED`.

## 2. Bối cảnh và ràng buộc

- Đội kỹ thuật GĐ1 có hai người; ưu tiên một đường đi chạy được từ web tới database.
- GĐ1 là **web-first**. Mobile và AI Triage chỉ giữ placeholder.
- Tiền, đơn hàng và tranh chấp cần một nguồn sự thật giao dịch duy nhất.
- Tiền bán hàng đi thẳng tới seller; REBOX không xây escrow cho tiền hàng.
- Ví ký quỹ và luồng hoàn tiền vẫn là vấn đề pháp lý có thể chặn ra mắt.
- Một `ReturnPackage` nguyên kiện là một đơn vị tồn kho và có tối đa một listing hiệu lực; checkout phải khóa đúng package đó bằng transaction database.
- Video là chứng cứ ưu tiên, không phải điều kiện để tiếp nhận khiếu nại.

## 3. Bảng quyết định

| ID | Quyết định | Trạng thái |
|---|---|---|
| A01 | Monorepo pnpm và ba runtime GĐ1 | `ACCEPTED` |
| A02 | Sáu module backend sâu | `ACCEPTED` |
| A03 | Supabase PostgreSQL + Auth là nền tảng dữ liệu/định danh | `ACCEPTED` |
| A04 | NestJS là authority của mọi mutation nghiệp vụ | `ACCEPTED` |
| A05 | PostgreSQL outbox; chưa dùng Redis/BullMQ | `ACCEPTED` |
| A06 | Spreadsheet và API sàn là hai kênh nhập ngang hàng, dùng chung contract | `ACCEPTED` |
| A07 | Mỗi lần checkout chỉ một seller | `ACCEPTED` |
| A08 | Hold dùng dự phòng ship 45.000đ ở MVP | `ACCEPTED` |
| A09 | Ký quỹ kích hoạt 100.000đ, không phân tier | `ACCEPTED` |
| A10 | PSP/vendor thanh toán chưa được chốt | `BLOCKED` |
| A11 | Ledger header + postings, ghi qua một interface | `ACCEPTED` |
| A12 | Evidence dùng kho WORM riêng, video tối đa 90 giây | `ACCEPTED` |
| A13 | Supabase Realtime chỉ là tín hiệu refetch | `ACCEPTED` |
| A14 | Supabase Singapore cần legal gate trước production | `ACCEPTED` |
| A15 | Các feature GĐ3/GĐ4 chưa thuộc MVP | `DEFERRED` |
| A16 | Bán nguyên `ReturnPackage`; `ReturnLine` chỉ là bản kê nguồn | `ACCEPTED` |

## 4. A01 — Monorepo và runtime GĐ1

Codebase giữ đúng cấu trúc trong `CODEBASE.md`:

```text
apps/web       Next.js buyer + seller + admin responsive
apps/api       NestJS HTTP composition root
apps/worker    composition root cho outbox và scheduled job
packages/backend
               implementation server-only dùng chung cho api/worker
packages/shared
               DTO, schema và type trung lập môi trường
packages/core  hàm thuần, state transition và tính toán không I/O
packages/api-client
               client sinh từ OpenAPI
packages/ui-tokens
               token giao diện; không chứa component web/native
```

Đây là **một modular monolith về mã nghiệp vụ nhưng có ba runtime**. `api` và `worker` không phải hai microservice sở hữu hai bản nghiệp vụ khác nhau; chúng chỉ compose cùng `@rebox/backend` theo hai entry point.

Không hứa tái sử dụng component giữa Next.js và React Native. Phần thực sự dùng lại là schema, API client, hàm thuần và UI token.

## 5. A02 — Sáu module backend sâu

| Module | Capability nằm bên trong | Interface chính cho caller |
|---|---|---|
| `identity` | profile, shop, membership, role, eKYC, notice/processing record, privacy request | quản lý actor/shop/capability và cung cấp interface processing/privacy |
| `inventory` | catalog, return inventory, CSV/manual import, moderation | tạo draft, publish và truy vấn listing |
| `commerce` | cart, fee snapshot, checkout và order | khởi tạo checkout và chuyển trạng thái order |
| `funds` | wallet, hold, ledger, payment orchestration | post transaction, hold/release/capture và đối soát |
| `fulfillment` | carrier, label, tracking, shipping settlement | tạo shipment và nhận carrier event |
| `claims` | dispute, evidence binding, quyết định, appeal, AI seam | mở/xử lý tranh chấp, gọi interface processing của identity và thực thi kết quả |

Các tên cũ như `Fee Engine`, `Shop`, `Payment`, `Risk`, `PublicAPI`, `Notification` và `Audit` không mặc định trở thành module ngang hàng:

- Fee Engine là implementation thuần bên trong `commerce`.
- Payment/Carrier/Object Storage/Notification là adapter tại seam bên ngoài.
- Public API là inbound adapter gọi lại interface của module hiện có.
- Audit, encryption, database, outbox và observability là platform implementation.
- Chỉ tách Risk thành module khi nó có state và interface độc lập thật sự.

Module không được đọc repository nội bộ của module khác. Caller đi qua interface nhỏ hoặc domain event; test cũng đi qua cùng interface đó.

## 6. A03 — Phạm vi của Supabase

Supabase được dùng cho:

- PostgreSQL — nguồn sự thật duy nhất của dữ liệu nghiệp vụ.
- Auth — credential, OTP, access token, refresh/session lifecycle.
- Storage — ảnh catalog/avatar không cần WORM.
- Realtime — tùy chọn cho tín hiệu UI, theo A13.

Không dùng:

- Supabase Edge Functions để chứa checkout, ledger, payment hoặc dispute.
- Supabase Storage cho evidence WORM. KYC ưu tiên upload trực tiếp tới eKYC provider hoặc kho private cô lập theo retention Legal; không mặc định áp Object Lock cho KYC.
- Hai database cùng giữ trạng thái order/wallet.

Drizzle là ORM và chủ sở hữu migration application schema. Raw SQL migration được dùng khi Drizzle không biểu diễn đủ RLS, grant, trigger, function hoặc extension. Supabase CLI chỉ quản lý local project/config và chạy cùng chuỗi migration; không tạo một lịch sử migration thứ hai.

## 7. A04 — Auth, authorization và ranh giới dữ liệu

### 7.1. Authentication

- Web dùng Supabase Auth qua adapter `apps/web/src/platform/auth`.
- NestJS xác minh access token theo issuer/audience/JWKS rồi ánh xạ claim `sub` sang profile nội bộ.
- REBOX không lưu `password_hash`, không tự phát hành refresh token và không tự xây OTP.
- Web không tự persist token vào Zustand/localStorage. Mobile sau này dùng secure storage của hệ điều hành.
- Secret key hoặc legacy `service_role` chỉ tồn tại trong API/worker; không được bundle vào frontend. Supabase xác nhận khóa này bypass RLS nên phải coi là secret tuyệt đối.

Domain có thể dùng UUID của `auth.users` làm khóa profile để giữ mapping đơn giản. ULID áp dụng cho các aggregate nghiệp vụ công khai như shop, listing, order và dispute; không áp dụng máy móc cho identity do Supabase sở hữu.

### 7.2. Authorization

Buyer là capability mặc định của user đã đăng nhập. Quyền seller nằm ở:

```text
shop_memberships(user_id, shop_id, role, status)
role = OWNER | MANAGER | WAREHOUSE | ACCOUNTING
```

Quyền nội bộ nằm riêng ở:

```text
platform_staff_roles(user_id, role, status)
role = SUPPORT | MODERATOR | DISPUTE_ARBITRATOR | SUPER_ADMIN
```

- Toggle Buyer/Seller chỉ đổi context giao diện, không cấp quyền.
- Admin không xuất hiện trong toggle và không tự đăng ký.
- `OWNER/MANAGER` được publish; `WAREHOUSE` chỉ scan/tạo draft; `ACCOUNTING` chỉ xem ví/báo cáo.
- Chỉ `DISPUTE_ARBITRATOR` được xin URL xem evidence gốc, phải có MFA/AAL2, lý do và audit.
- Nest guard và truy vấn có điều kiện ownership/membership là lớp authority.
- RLS và grant là defense-in-depth. `anon`/`authenticated` không có quyền ghi trực tiếp bảng order, wallet, ledger, hold, payout, listing hoặc dispute.

Nếu một bảng được expose qua Supabase Data API, phải bật RLS, thu hồi grant mặc định không cần thiết và có test policy. Bảng tài chính mặc định không expose.

## 8. A05 — Async, reservation và outbox

MVP không thêm Redis/BullMQ. PostgreSQL xử lý:

- reservation bằng row lock + trạng thái `RESERVED` + `reserved_until`;
- transactional outbox trong cùng transaction với thay đổi nghiệp vụ;
- worker claim event/job bằng `FOR UPDATE SKIP LOCKED`;
- scheduled job bằng `available_at`, retry count và dead-letter state;
- idempotency bằng unique constraint bền vững.

Mọi workflow chạm reservation/tiền/case của một sub-order dùng cùng lock order: `wallet → shop → listings → return_packages theo ULID → order → sub_order → fund_hold → dispute_case/dispute/refund`. ID được resolve read-only trước, state phải đọc lại dưới lock; không có flow nào được giữ listing/package rồi chờ wallet hoặc giữ sub-order rồi chờ wallet.

Redis chỉ được đề xuất lại khi metric chứng minh PostgreSQL là điểm nghẽn. Nếu thêm sau, Redis là cache/transport; PostgreSQL vẫn là nguồn sự thật.

Quy tắc đúng là **không gọi HTTP bên ngoài trong database transaction**. Lookup chỉ đọc có thể gọi đồng bộ ngoài transaction khi UX cần, với timeout/circuit breaker/fallback. Side effect không cần trả ngay phải đi qua outbox.

## 9. A06 — Hai kênh nhập bản kê ngang hàng

UI có hai lựa chọn rõ ràng: **Import trực tiếp từ Shopee/TikTok** và **Import CSV/XLSX**. Đây là hai kênh ngang hàng do seller chủ động chọn, không phải chuỗi ưu tiên hay fallback tự động. Hiện chưa có partner approval, credential và contract API đã kiểm chứng, nên bản chạy đầu tiên chỉ bật spreadsheet; nút API hiển thị “Sắp có” hoặc nằm sau feature flag.

Hai kênh phải trả cùng một contract chuẩn hóa `ReturnManifestDraft`: thông tin package, danh sách `ReturnLine`, nguồn dữ liệu và thời điểm lấy. Cả hai đi qua cùng preview → validate → commit; luồng scan/listing phía sau chỉ đọc package đã commit và không biết dữ liệu được nhập bằng kênh nào. Chỉ chừa **một seam nhỏ** ở ranh giới importer; chưa dựng plugin framework hoặc gọi API giả.

Nếu cùng một package được nhập lại qua kênh khác, hệ thống giữ provenance và áp dụng cùng quy tắc idempotency/conflict; không tự ghi đè listing `ACTIVE` hoặc package `RESERVED/SOLD`. Cả hai kênh lọc allowlist trước khi lưu và không lưu PII của buyer gốc.

Scan không gọi API sàn và không tự chuyển nguồn. Nếu không tìm thấy bản kê đã commit, UI đưa seller về màn hình chọn nguồn nhập. Đăng thủ công vẫn tồn tại như flow catalog riêng, nhưng không được giả thành scan-to-list tự động.

## 10. A07 — Checkout một seller

Giỏ có thể chứa nhiều listing để người dùng lưu lại, nhưng checkout package-backed ở MVP chỉ nhận **một listing, quantity 1**. Quy tắc này giữ đúng flow một kiện cũ → một vận đơn mới dán trực tiếp. Checkout lẫn seller vẫn trả `422 MULTI_SELLER_CHECKOUT_NOT_SUPPORTED`; nhiều package trả `422 ONE_PACKAGE_PER_CHECKOUT`.

MVP giữ `orders` và `sub_orders`, nhưng quan hệ là một-một và phải có unique constraint trên `sub_orders.order_id`. Lý do giữ `sub_order`: đây là đơn vị fulfillment, fee, hold và dispute; nó cũng là seam mở rộng multi-seller sau này mà không làm checkout MVP phức tạp.

Hệ quả:

- một checkout, một package, một hold, một QR/COD flow và một nhãn vận đơn mới;
- không có trạng thái thanh toán một phần;
- freeship và fee tính trên đúng seller/order;
- multi-seller checkout chỉ mở lại khi PSP và state machine thanh toán một phần đã được thiết kế riêng.

Reservation ban đầu có TTL **30 phút** để buyer chọn phương thức. Nếu buyer chọn VietQR trong cửa sổ này, transaction `/pay` gia hạn hold đến `orders.created_at + 12 giờ` để chờ seller xác nhận; deadline tuyệt đối này không reset. COD giữ flow riêng. Tiền đến sau deadline tương ứng đi vào `payment_unmatched`, không hồi sinh order cũ.

## 11. A08 — Công thức hold

```text
buyer_shipping_fee = 0 nếu item_total >= 100.000đ,
                     ngược lại 15.000đ

commission_estimate = max(round(item_total × 20%), 10.000đ)

hold_amount = item_total
            + buyer_shipping_fee
            + commission_estimate
            + 45.000đ shipping_reserve
```

Mức 22.000đ cho đơn dưới 50.000đ bị loại vì không đủ bảo vệ kịch bản hoàn hai chặng trong chính ví dụ rủi ro của `00-TONG-QUAN`. Reserve 45.000đ vẫn là cấu hình có hiệu lực theo thời gian, không hardcode trong component.

Checkout snapshot toàn bộ input, output và config version. UI chỉ render breakdown từ API, không tự tính tiền.

| item total | buyer ship | commission | reserve | hold |
|---:|---:|---:|---:|---:|
| 15.000 | 15.000 | 10.000 | 45.000 | 85.000 |
| 40.000 | 15.000 | 10.000 | 45.000 | 110.000 |
| 60.000 | 15.000 | 12.000 | 45.000 | 132.000 |
| 99.999 | 15.000 | 20.000 | 45.000 | 179.999 |
| 100.000 | 0 | 20.000 | 45.000 | 165.000 |
| 150.000 | 0 | 30.000 | 45.000 | 225.000 |
| 200.000 | 0 | 40.000 | 45.000 | 285.000 |
| 500.000 | 0 | 100.000 | 45.000 | 645.000 |

Checkout chỉ **khóa** commission ước tính. Doanh thu commission chỉ được ghi nhận khi order `COMPLETED`; refund không thu commission.

## 12. A09 — Chính sách ký quỹ MVP

- Shop được kích hoạt bán khi số dư ký quỹ đã settle đạt tối thiểu `100.000đ`.
- Không có `deposit_tier`, công thức AOV động hoặc ưu đãi theo hạng ở MVP.
- Năng lực bán được suy ra từ số dư khả dụng và hold cần cho từng listing.
- Shop đang hoạt động không được rút xuống dưới 100.000đ. Muốn rút hết phải pause shop, không còn hold/dispute/nghĩa vụ mở.
- Min/max cho từng giao dịch top-up là giới hạn PSP và cấu hình vận hành riêng, không được trộn với `activation_min_balance`.
- `debt_ceiling = 0`: checkout không cấp tín dụng. Nếu chi phí thực tế vượt hold, ghi `SHOP_DEBT`, giữ available không âm và khóa shop để xử lý.

Greedy coverage giữ listing có `hold_estimate` thấp trước (`ORDER BY hold_estimate ASC`) và ẩn listing đắt trước. Publish không tạo hold thật. Inventory rỗng là no-op, không được khóa shop; activation/suspension/debt là shop gate, còn coverage chủ yếu quyết định visibility của từng listing.

## 13. A10 — Payment/PSP còn bị chặn

**PayOS chỉ là ứng viên, chưa phải quyết định.** Chưa có bằng chứng đủ về custody, top-up, payout/refund, withdrawal, webhook/sao kê seller, AML/KYC, hợp đồng và giấy phép phù hợp với mô hình ký quỹ.

Production payment chỉ được mở khi Business + Legal có xác nhận bằng văn bản cho:

1. chủ thể có giấy phép và vai trò từng bên;
2. nơi tiền ký quỹ được giữ và cách tách khỏi tiền hoạt động;
3. top-up, hold/custody, payout refund, withdrawal;
4. webhook, idempotency, reconciliation và xử lý giao dịch lệch;
5. phí, hạn mức, SLA, AML/KYC và dữ liệu xuyên biên giới.

Cho tới lúc đó:

- domain chỉ biết interface `PaymentProvider`;
- test/local dùng fake adapter;
- không chạy giao dịch tiền thật;
- Supabase không đóng vai trò PSP và không giữ tiền.

Với VietQR, tiền đi thẳng vào tài khoản seller. Bank event khớp chính xác tài khoản, nội dung và số tiền chỉ chuyển payment sang `PAYMENT_OBSERVED`; **không tự xác nhận đơn và không mở fulfillment**. Seller phải bấm xác nhận đã nhận đủ tiền thì sub-order mới sang `CONFIRMED` và được tạo vận đơn. Chuyển thiếu, thừa hoặc đến sau deadline đều vào `payment_unmatched`.

Deadline seller xác nhận là **12 giờ tính từ `orders.created_at`**, không reset khi buyer báo đã chuyển, reload hay retry. Hết hạn: có `PAYMENT_OBSERVED` thì hủy và tạo full refund bằng `buyer_payable` từ hold/ký quỹ seller; `UNPAID` thì chỉ hủy và release hold; `BUYER_REPORTED` chưa được provider khớp thì hủy + review, không auto-payout dựa trên lời khai. Khi carrier hủy trước bàn giao với reason đã chuẩn hóa `SELLER_NO_HANDOVER/PICKUP_FAILED`, áp dụng cùng payment guard; chỉ debit seller nếu lỗi bàn giao thực sự thuộc seller.

Payment intent phải snapshot account/provider/amount/content/deadline lúc phát QR; webhook không đọc payout account mutable của shop. `payment_unmatched` là case workflow có immutable provider event, maker/checker, reason/audit/idempotency; không cho ops sửa balance trực tiếp hoặc gắn late payment vào order đã expire mà không tái khóa listing/wallet và dựng lại hold trong một transaction.

Event auto-match phải là normalized `CREDIT` đã `FINAL/SETTLED`, đúng currency/account/amount/reference và còn TTL. Reversal/correction là compensating workflow, không phải credit mới. Chuyển thiếu không được hướng dẫn “chuyển bù” ở MVP vì chưa có mô hình aggregate nhiều event.

Production phải chọn và ghi thành policy version cho **từng scenario/fault party**, không được âm thầm trộn hai execution mode:

- `PSP_CUSTODIAL`: PSP/rail được phép giữ/chi tiền; REBOX chỉ tạo refund payable/payout khi văn bản A10 xác nhận custody, funding source, refund rail và quyền sử dụng ký quỹ.
- `SELLER_DIRECT`: seller trực tiếp hoàn buyer, nộp proof theo deadline; REBOX không ghi rằng mình đã trả buyer và chỉ reserve/capture deposit trong phạm vi Legal/hợp đồng cho phép.

Yêu cầu sản phẩm cho hai scenario `SELLER_CONFIRMATION_TIMEOUT` và `PICKUP_FAILURE` do seller là hoàn tự động từ ký quỹ seller, tức cần rail tương đương `PSP_CUSTODIAL`. Đây là quyết định nghiệp vụ mục tiêu, **không phải quyền bật production**: nếu A10/Legal chưa xác nhận PSP có quyền giữ và chi khoản ký quỹ cho buyer, hệ thống chỉ được chạy fake/sandbox hoặc chuyển sang review, tuyệt đối không tự chuyển tiền thật.

Refund là aggregate riêng. Có các gate `WAITING_RETURN`, `WAITING_COST`, `WAITING_RECIPIENT` hoặc `SELLER_ACTION_REQUIRED` trước `PAYOUT_READY/PENDING`; timeout là `UNKNOWN/RECONCILING`, không phải fail. Full/partial payment chỉ thành `REFUNDED/PARTIALLY_REFUNDED` sau `PAID` hoặc seller-direct `VERIFIED`. Partial không yêu cầu trả hàng; tổng refund effective không vượt buyer payable. VietQR chỉ hoàn qua original rail/reference được xác minh; COD yêu cầu step-up auth, ownership verification và recipient snapshot bất biến.

Mỗi payout có một stable provider idempotency key; execute/query/webhook là attempt append-only. Chỉ terminal failure đã xác minh mới được release/retry theo contract. Unmatched exposure chỉ được reserve từ seller deposit nếu A10/Legal cho phép; nếu không, withdrawal bị hard-block. Order đã `EXPIRED|CANCELLED_BY_TIMEOUT|CANCELLED_BY_PICKUP_FAILURE` không bao giờ hồi sinh: nếu buyer vẫn mua thì tạo order/hold mới và link allocation sau maker/checker.

Carrier/COD contract phải chốt `shipment.settlement_mode` (billed separately hay deducted from remittance), gross collected, fee/deduction, net remitted và beneficiary. Không đồng thời ghi shipping recovery và carrier payable theo mô hình gross nếu carrier đã khấu trừ cước vào remittance net.

## 14. A11 — Ledger và idempotency

Không dùng một bảng `ledger_entries` vừa làm transaction vừa làm posting. Schema canonical gồm:

```text
ledger_transactions
  id, type, idempotency_key UNIQUE, ref_type, ref_id,
  status, occurred_at, created_at

ledger_postings
  id, transaction_id FK, account, wallet_id, amount, created_at
```

Bất biến `SUM(postings.amount) = 0` không thể được đảm bảo bằng ordinary `CHECK` constraint liên hàng. Mọi ghi ledger phải đi qua **một interface posting**; implementation dùng database function/finalize step hoặc deferred constraint trigger để chỉ cho transaction chuyển sang `POSTED` khi cân bằng. Thu hồi quyền insert/update/delete trực tiếp trên posting khỏi role ứng dụng thông thường; ledger là append-only.

Tách ba loại idempotency:

- `idempotency_requests`: request client và cached response có TTL;
- `provider_events`: event ID của PSP/carrier, unique vĩnh viễn;
- `ledger_transactions.idempotency_key`: khóa nghiệp vụ vĩnh viễn.

Đây là operational subledger, không tự thay thế sổ kế toán pháp định. Asset settlement dùng account động theo provider/account/currency; mapping kế toán và gross/net fee/VAT chỉ chốt cùng A10/Tax/kế toán. Withdrawal đi `HOLD → SETTLED | TERMINAL_FAILED`, còn `UNKNOWN/RECONCILING` tiếp tục nằm trong `SHOP_WITHDRAWAL_PENDING`. Balance projection cập nhật cùng transaction gồm available/order-locked/withdrawal-pending/unmatched-reserve/debt. Top-up trả debt trước rồi mới tăng available. Đối soát theo provider/account/currency/cutoff với opening/closing/fees/adjustments, không so tổng net của cả ledger với một số dư tổng.

## 15. A12 — Evidence, KYC và thời lượng video

### Evidence

- Video tối thiểu 15 giây, tối đa **90 giây**; server là authority.
- Video không bắt buộc để mở claim. Không có video thì chuyển manual review.
- Video gốc có mốc giữ mục tiêu hiện tại 90 ngày sau `dispute_case.final_closed_at`; derivative/biên bản là 3 năm. Đây là policy versioned cần Legal duyệt, không phải số hardcode vĩnh viễn. Mọi appeal round dùng chung một case/mốc.
- `final_closed_at` là mốc đóng nghiệp vụ sau appeal + payout/proof/return; legal hold không trì hoãn mốc này mà chỉ kéo dài bảo toàn/xóa. Nhiều hold có thể chồng nhau và provider chỉ physical-release sau hold cuối.
- Seller không bao giờ xem video gốc; chỉ xem derivative đã được duyệt.
- Upload intent chỉ được cấp sau authz, notice/consent cần thiết và validation. Tạo dispute không trả sẵn URL upload.
- Notice được lưu bằng `processing_records`; lựa chọn/rút consent là event append-only theo từng purpose. Evidence tham chiếu processing record, không tham chiếu một "consent" chung có thể bị sửa đè.

Supabase Storage không hỗ trợ S3 bucket versioning và Object Lock, nên không dùng cho evidence WORM. Evidence bytes phải nằm ở provider riêng đã xác minh đủ:

- private bucket;
- versioning;
- retention/Object Lock compliance;
- presigned multipart;
- lifecycle theo `retention_until`, hỗ trợ legal hold và chỉ gia hạn Object Lock;
- region và hợp đồng xử lý dữ liệu được Legal duyệt.

Provider cụ thể còn mở; `ObjectStorage` là seam thật với production adapter và local/test adapter. Metadata/hash/chain of custody nằm trong Supabase PostgreSQL.

Vì chưa biết `final_closed_at` tại thời điểm upload và Object Lock compliance không thể rút ngắn, ingest phải đặt một `object_lock_until` tạm tối thiểu do Legal duyệt. Watchdog định kỳ phải gia hạn trước safety window cho mọi evidence có case chưa đóng hoặc legal hold chưa release vật lý; không được để lock hết trong lúc vụ việc còn mở. Claims module chốt `final_closed_at`; retention worker snapshot policy/version và chỉ gia hạn lock nếu cần. Thời điểm xóa thực tế là mốc muộn hơn giữa retention đích, lock bất biến và `preserve_until`, với điều kiện mọi provider hold đã `RELEASED` và reconcile. Horizon tạm phải được giữ ngắn nhất có thể và công khai đúng với thực tế; không được hứa “xóa đúng ngày 90” nếu provider vẫn khóa lâu hơn.

Metadata phải lưu đủ `provider/bucket/key/object_version_id`, lock mode/thời điểm, checksum và audit. Mọi read/delete/legal-hold target đúng version ID và verify SHA-256; không đọc chỉ theo key trong bucket versioned. Trạng thái legal hold tại DB phải được áp dụng sang provider qua outbox và có reconcile, không coi row DB đơn lẻ là đã bảo toàn object. Xóa bytes dùng state `ACTIVE → DELETE_PENDING → DELETED`, lưu provider receipt và giữ row/hash/chain metadata theo policy. Staging copy phải purge sau khi WORM version/hash đã verify.

A12 là quyết định kỹ thuật đã chốt nhưng **production sub-gate vẫn BLOCKED** tới khi Legal duyệt purpose/basis/notice/retention và provider qua contract/capability test về versioning, Object Lock, legal hold, deletion, region và audit.

### KYC

Ưu tiên upload trực tiếp tới eKYC provider hoặc kho private cô lập. Không gửi CCCD/selfie base64 qua JSON API. Xóa ảnh gốc sau verify nếu Legal/provider không yêu cầu giữ; chỉ lưu dữ liệu tối thiểu đã mã hóa, provider reference, kết quả, hash, audit và `retention_until` do Legal duyệt.

## 16. A13 — Realtime

Realtime không phải nguồn sự thật và không kích hoạt nghiệp vụ tiền. Nếu dùng, event chỉ thông báo client rằng một projection đã thay đổi; client phải refetch NestJS API.

Không subscribe trực tiếp bảng wallet, ledger, hold, payment hoặc evidence. Polling là fallback bắt buộc cho payment/order status.

## 17. A14 — Region, backup và production gate

Chọn Supabase **specific region Singapore (`ap-southeast-1`)** cho dev/staging. Tài liệu Supabase xác nhận mỗi project có một primary region và region quyết định nơi primary project data được lưu; region là kiểm soát vị trí, không tự chứng minh tuân thủ pháp luật.

Trước khi gate A14 đóng, dev/staging chỉ dùng fixture synthetic hoặc dữ liệu đã ẩn danh thực sự. Cấm production dump, CCCD/eKYC, evidence, thông tin thanh toán và dữ liệu cá nhân thật. Bất kỳ test nào cần dữ liệu thật phải qua cùng data-transfer/DPA/Legal gate như production; nhãn “staging” không tạo ngoại lệ pháp lý.

Production chỉ được tạo cùng region sau khi Legal hoàn tất đánh giá nghĩa vụ chuyển dữ liệu ra nước ngoài, DPIA/DPA và phê duyệt loại dữ liệu được phép đưa lên. Không ghi trong tài liệu hoặc truyền thông rằng dữ liệu “lưu tại Việt Nam” khi dùng Singapore. Gate inventory phải bao phủ Supabase, WORM/eKYC/PSP, logs, backup, CDN và AI/subprocessor tương lai; có owner, `first_processing_at`, `first_transfer_at`, statutory deadline do Legal xác nhận, `submitted_at`, receipt và trigger cập nhật khi data flow/provider/purpose đổi.

Trước giao dịch tiền thật:

- dùng paid project phù hợp, không dùng Free project có thể pause;
- bật PITR với retention đã duyệt ngân sách; báo giá PITR/compute là budget gate vì có thể vượt baseline hạ tầng GĐ1;
- logical backup off-site chỉ đi tới region/provider đã được Legal duyệt, có encryption key/access/retention riêng; không đẩy tùy tiện lên S3/Drive cá nhân;
- diễn tập restore synthetic trước A14. Restore dữ liệu thật chỉ vào environment nằm trong cùng approval boundary; ghi RPO/RTO thực đo;
- backup là data class có retention riêng. Deletion/anonymization tombstone và active holds phải tồn tại ngoài snapshot được restore; replay + verify chúng trước khi mở access để dữ liệu đã xóa không sống lại;
- backup evidence/object storage theo cơ chế riêng vì database backup không chứa object bytes; mọi mirror/copy phải giữ ít nhất cùng region/lock/hold/delete policy, không tạo raw copy yếu hơn WORM.

Tham chiếu kỹ thuật chính thức:

- [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase database backups và PITR](https://supabase.com/docs/guides/platform/backups)
- [Supabase RLS và service role](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)

## 18. A15 — Phạm vi bị hoãn

| Hạng mục | Mốc xem xét lại |
|---|---|
| Expo mobile | GĐ3, khi web mobile là điểm nghẽn đã đo được |
| AI Triage | Sau ít nhất 200 vụ manual và tải vận hành đủ lớn |
| Shopee/TikTok live API | GĐ3, sau partner approval/ToS review |
| Public API ERP | Khi có ít nhất 5 shop thật yêu cầu |
| Multi-seller checkout | Sau khi PSP và partial-payment state machine được thiết kế |
| Redis/BullMQ | Khi metric chứng minh PostgreSQL outbox không đạt SLO |
| Kubernetes/Meilisearch | Khi tải thực tế vượt khả năng topology hiện tại |
| Loyalty/voucher | Sau khi luồng giao dịch, thuế và hóa đơn ổn định |
| Phân tích hàng hoàn theo SKU | GĐ3, sau khi có dữ liệu và nhu cầu seller đủ lớn |
| Paid promotion/ranking | GĐ3, sau khi có traffic thật và Legal duyệt cơ chế quảng cáo/nhãn “Tài trợ” |

## 19. A16 — Grain kho hàng hoàn và storefront

Một tracking xác định đúng một `ReturnPackage` trong phạm vi shop và platform. REBOX bán nguyên package đó, không mở kiện, không kiểm đếm và không sinh `ReturnUnit`. Một package có nhiều `ReturnLine`; các line chỉ là bản kê do CSV/API khai báo, không phải xác nhận vật lý.

Cardinality: `ReturnPackage 1→N ReturnLine`; `ReturnPackage 1→0..1 Listing` ở MVP. Sau scan, package có đúng một listing hiện hành. Listing có `availableQuantity = 1` khi package `AVAILABLE`, và bằng `0` khi `RESERVED`, `SOLD` hoặc `VOID`. Reserve/sale khóa package cụ thể. Package nhiều SKU hoặc một line có `source_quantity > 1` vẫn là một listing bán cả kiện.

Dedupe package bằng `(shop_id, source_platform, source_tracking_hash)` và line bằng `(return_package_id, source_item_ref)`. Tracking được mã hóa/HMAC ở package và không bao giờ xuất hiện trên storefront hoặc public API. Import lại cùng dữ liệu là idempotent; dữ liệu khác trên cùng khóa tạo phiên bản/conflict để review, không âm thầm thay listing đang bán.

Mọi listing nguồn package phải công bố `UNOPENED_UNINSPECTED`. `SealStatus` chỉ mô tả vỏ/seal nhìn từ bên ngoài, không được đổi thành condition của sản phẩm. `source_quantity`, SKU, tên và giá là dữ liệu nguồn. Trùng SKU không chứng minh cùng sản phẩm và không được dùng để gom tồn.

Trạng thái `ACCEPTED` ngày 2026-09-04; nội dung Package → Line → Unit trước đó bị rút lại cùng ngày sau khi chủ dự án xác nhận mục tiêu sản phẩm là bán nguyên kiện.

## 20. Thứ tự triển khai sau khi tài liệu được chốt

1. Baseline toolchain, Supabase local/dev, CI và migration policy.
2. Vertical slice: Supabase Auth → shop profile/membership → manual listing → public listing page.
3. Sau khi A16 được duyệt: schema/migration Package/Line/Listing, contract nguồn bản kê và CSV preview/commit; không tạo Unit/Product cho slice nguyên kiện.
4. Ledger/hold với integration test trên PostgreSQL thật.
5. Single-seller checkout, payment adapter đã được Legal duyệt và shipping.
6. Manual dispute/evidence/admin.
7. Hardening, restore drill và internal pilot.

Không bắt đầu bước 5 với tiền thật khi A10 còn `BLOCKED`.
