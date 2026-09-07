# REBOX sandbox recovery runbook

Chỉ dùng với local/staging synthetic. Không chạy `db:reset` nếu chưa xác nhận dữ liệu có thể bỏ.

## Kiểm tra nhanh

```bash
corepack pnpm supabase status
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm build
```

## Sự cố

- Database down: dừng API/worker mutation, khởi động Supabase, chạy readiness và `db:migrate`; không replay thủ công câu SQL nghiệp vụ.
- Worker backlog: kiểm tra `outbox_events` theo `PENDING/PROCESSING/DEAD`, sửa nguyên nhân rồi đưa đúng event `DEAD` về `PENDING`. Stable key/idempotency ngăn side effect trùng.
- Reservation kẹt: chạy worker; `expireReservations` chỉ giải phóng order `RESERVED` quá hạn, không chạm order đã confirm.
- Duplicate carrier/provider event: cùng ID/cùng hash là no-op; cùng ID/khác hash là `EVENT_ID_CONFLICT` và phải điều tra.
- Fake provider failure: giữ intent/outbox để retry; không đổi sang provider production.
- Evidence unavailable: case vẫn được tiếp nhận; không fallback seller sang object gốc.
- KYC outage: giữ `PROCESSING`/`MANUAL_REVIEW`, production fail closed, không tự verified.

## Backup/restore synthetic

Dùng Supabase CLI/local PostgreSQL backup theo môi trường được phê duyệt. Sau restore chạy invariant query: mọi ledger transaction `POSTED` có tổng posting `0`, mỗi package có tối đa một sub-order item/listing, active hold trỏ order `RESERVED`, và tombstone/privacy receipt còn nguyên. Rollback application trước; migration schema là forward-only, không sửa file migration đã chạy.
