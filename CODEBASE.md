# REBOX codebase skeleton

Trạng thái hiện tại: chỉ có cấu trúc monorepo, chưa có mã nguồn, dependency hay cấu hình framework.

Nguồn quyết định canonical: [`docs/07-ARCHITECTURE-DECISIONS.md`](docs/07-ARCHITECTURE-DECISIONS.md). File này ánh xạ các quyết định đó vào codebase; nếu ví dụ cũ trong docs khác nội dung dưới đây thì ADR thắng.

## Cấu trúc

```text
rebox/
├─ apps/
│  ├─ api/          # NestJS HTTP composition root
│  ├─ worker/       # Outbox/job composition root
│  ├─ web/          # Next.js buyer + seller + admin
│  ├─ mobile/       # GĐ3, chưa scaffold
│  └─ ai-triage/    # GĐ3, chưa scaffold
├─ packages/
│  ├─ backend/      # Module server-only dùng chung bởi api và worker
│  ├─ shared/       # Type, enum, Zod schema và hằng số
│  ├─ core/         # Logic thuần, không I/O
│  ├─ api-client/   # Client sinh từ OpenAPI
│  └─ ui-tokens/    # Token giao diện trung lập web/mobile
├─ db/
│  ├─ migrations/
│  └─ seeds/
└─ docs/
```

## Module backend

Sáu module là ranh giới capability sâu, không phải sáu thư mục CRUD:

| Module | Sở hữu | Giao diện cô đọng cho caller |
|---|---|---|
| `identity` | Profile, shop, membership/capability, eKYC, notice/processing record và privacy request | Xác định actor/shop, kiểm tra capability và cung cấp interface privacy/processing cho module khác |
| `inventory` | CSV manifest, scan lookup, sealed-package listing, moderation, catalog query | Nạp bản kê, tạo draft, publish, ẩn/hiện và truy vấn listing |
| `commerce` | Cart, fee snapshot, checkout một seller, order state | Khởi tạo checkout, xác nhận payment result và chuyển trạng thái order |
| `funds` | Wallet, ledger header/postings, hold, payment orchestration, reconciliation | Post transaction; create/release/capture hold; đối soát |
| `fulfillment` | Shipping intent, carrier adapter, tracking, shipping settlement | Tạo shipment ngoài DB transaction và nhận carrier event idempotent |
| `claims` | Dispute, evidence binding, resolution, appeal | Mở/xử lý tranh chấp, kiểm tra processing record qua interface identity, cấp quyền evidence và thực thi kết quả |

`audit`, `database`, `encryption`, `observability`, `outbox` là platform capability dùng chung trong `packages/backend/src/platform`, không phải module nghiệp vụ ngang hàng. Auth, carrier, marketplace, notification, object storage và payment là adapter tại biên hệ thống.

Chỉ tạo interface cho biên thật: external provider, clock/ID cần test, ledger writer và capability giữa module. Không tạo interface/factory chỉ vì một class đang có một implementation.

## Runtime và ownership

| Runtime | Trách nhiệm | Không được chứa |
|---|---|---|
| `apps/web` | Next.js responsive cho buyer, seller và admin web | Business rule tiền/order; secret server; direct business mutation tới Supabase |
| `apps/api` | NestJS HTTP composition root, authz, orchestration đồng bộ | Bản sao logic module; job loop dài; gọi side effect ngoài trong DB transaction |
| `apps/worker` | Claim PostgreSQL outbox, scheduled job, retry/dead-letter, reconciliation/retention | HTTP controller hoặc business rule riêng khác API |

`apps/api` và `apps/worker` cùng gọi implementation trong `@rebox/backend`; chúng không gọi HTTP lẫn nhau để dùng lại nghiệp vụ. `apps/mobile` và `apps/ai-triage` chỉ là placeholder GĐ3, chưa thuộc runtime MVP.

## Quy tắc phụ thuộc

- `apps/*` được phép import từ `packages/*`.
- `packages/*` không import từ `apps/*`.
- `apps/web` và `apps/mobile` không import `@rebox/backend`.
- `@rebox/core` và `@rebox/shared` không import framework, database hoặc Supabase SDK.
- Component không gọi `fetch` trực tiếp; mọi request đi qua `@rebox/api-client`.
- `apps/api` và `apps/worker` chỉ là composition root; không nhân đôi nghiệp vụ.
- Module không đọc bảng thuộc module khác để né interface. Query projection chỉ được phép qua read model đã xác định và không thay đổi invariant module sở hữu.
- Không gọi HTTP ra PSP/carrier/notification/object storage bên trong DB transaction. Side effect không cần phản hồi ngay đi qua outbox; lời gọi đồng bộ phục vụ UX phải chạy sau commit, lưu intent/idempotency trước và có job retry/reconcile.
- Package chỉ nhận abstraction khi có consumer thật trong vertical slice; không lấp đầy skeleton bằng boilerplate.

## Vị trí của Supabase

### PostgreSQL

- Supabase PostgreSQL là nguồn sự thật giao dịch duy nhất; implementation DB nằm tại `packages/backend/src/platform/database`.
- NestJS là authority của mọi business mutation. Browser không ghi trực tiếp listing, order, wallet, ledger, hold, payout hoặc dispute.
- Bảng expose qua Supabase Data API phải bật RLS, thu hồi grant không cần thiết và có policy test. Bảng tài chính mặc định không expose.
- Reservation dùng row lock + trạng thái + TTL 30 phút. PostgreSQL outbox dùng `FOR UPDATE SKIP LOCKED`; MVP không có Redis/BullMQ.

### Auth

- Supabase Auth sở hữu credential, OTP/session, refresh và `auth.users` UUID. REBOX không có `password_hash` hay refresh-token table riêng.
- Web chỉ dùng Supabase cho auth/session, rồi gửi access token tới NestJS API.
- NestJS xác minh JWT/JWKS và ánh xạ actor sang `profiles`, `shop_memberships`, `platform_staff_roles`.
- `service_role`/server secret không bao giờ vào bundle hoặc biến môi trường public. Toggle Buyer/Seller chỉ đổi UI context, không cấp quyền.

### Storage và Realtime

- Supabase Storage có thể giữ ảnh catalog/media thông thường.
- Evidence gốc dùng provider WORM/Object Lock riêng; derivative/report cũng version-addressed và tách quyền truy cập. Video tối đa 90 giây; retention target tính từ `dispute_case.final_closed_at`, nhưng xóa không trước Object Lock/legal hold.
- Supabase Realtime, nếu bật, chỉ invalidate cache để client refetch NestJS API. Payload Realtime không xác nhận payment/order/wallet/hold/dispute.

## Migration và schema ownership

- `db/migrations/` là lịch sử migration duy nhất, append-only sau khi đã chạy trên staging.
- Drizzle mô tả table/query và có thể sinh migration draft; RLS, grant, extension, trigger/deferred validation dùng SQL được review trong cùng migration.
- Không sửa schema bằng Supabase Dashboard mà không đưa thay đổi tương đương vào migration.
- Mỗi migration tiền/quyền truy cập cần forward test, rollback/restore strategy và kiểm thử trên database sạch.
- Seed chỉ chứa dữ liệu giả/cấu hình an toàn; không chứa credential, PII hoặc snapshot production.

## Invariant GĐ1 phải phản ánh trong code

- Một checkout chỉ có item của một shop, tạo đúng một `sub_order`; request lẫn seller trả 422.
- Hold dùng fee snapshot và reserve cố định 45.000đ theo phiên bản config; commission chỉ ghi nhận khi order hoàn tất.
- Shop kích hoạt ở số dư settled tối thiểu 100.000đ; không có tier và materialized wallet balance không âm.
- Ledger dùng `ledger_transactions` + `ledger_postings`: posting bất biến, header chỉ finalize một chiều rồi khóa; cân sổ được kiểm tra qua interface ghi sổ + reconciliation, không dựa vào một `CHECK` cross-row thông thường.
- Withdrawal giữ funds ở `PENDING` khi provider `UNKNOWN/RECONCILING`; chỉ `SETTLED` hoặc terminal failure đã xác minh mới kết thúc. Refund là aggregate riêng theo execution mode; full/partial `payment_status` chỉ thành `REFUNDED/PARTIALLY_REFUNDED` sau PSP `PAID` hoặc seller-direct `VERIFIED`, không dùng fulfillment status giả.
- Workflow chạm reservation/tiền/case khóa theo `wallet → listings → order → sub_order → hold → case/dispute/refund`; cùng idempotency key nhưng payload hash khác trả conflict, không replay như request cũ.
- Mọi evidence read/delete/hold target đúng provider/bucket/key/version và verify checksum; appeal dùng chung một `dispute_case` nên không khởi động retention sớm theo từng round.
- Payment provider và evidence provider còn là gate; không hardcode PayOS hoặc Supabase Storage như quyết định production.
- `SPREADSHEET` và `PLATFORM_API` là hai kênh nhập bản kê ngang hàng qua cùng contract chuẩn hóa. Bản đầu chỉ bật CSV/XLSX; nút API hiển thị “Sắp có” tới khi đủ partner/ToS gate. Mobile, AI, Public API ERP, loyalty/voucher và multi-seller checkout đều bị hoãn.

## Slice triển khai đầu tiên

```text
Supabase Auth
  → NestJS xác minh actor
  → profile + shop + OWNER membership
  → manual listing draft/publish
  → public listing detail trên Next.js
```

Slice này tạo schema/interface tối thiểu cần dùng và có test xuyên ranh giới. Không dựng trước toàn bộ ledger, payment, carrier hoặc AI để “hoàn thiện kiến trúc”.

## Chưa tạo

- Mã nguồn `.ts`, `.tsx` hoặc `.py`.
- Dependency và lockfile.
- Cấu hình Next.js, NestJS, Expo, Drizzle hoặc Supabase CLI.
- Migration, seed và client OpenAPI sinh tự động.

Các phần trên chỉ được thêm khi bắt đầu slice triển khai tương ứng.
