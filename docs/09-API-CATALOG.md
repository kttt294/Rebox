# REBOXE API Catalog

Base URL local: `http://127.0.0.1:3001`. Tất cả route dưới đây đã có controller/module; trạng thái là `IMPLEMENTED_LOCAL` hoặc `SANDBOX_ONLY`. Payment/carrier/evidence production là `BLOCKED_PROVIDER`. Mobile, AI triage và live marketplace API là `DEFERRED_GĐ3`.

## Inventory và moderation

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/v1/categories`, `/v1/listings`, `/v1/listings/{id}`, `/v1/shops/{id}` | `IMPLEMENTED_LOCAL` |
| POST | `/v1/shops/{shopId}/return-imports/preview`, `/v1/shops/{shopId}/return-imports/{batchId}/commit` | `IMPLEMENTED_LOCAL` |
| POST | `/v1/shops/{shopId}/return-packages/scan`, `/v1/shops/{shopId}/return-packages/listings/batch` | `IMPLEMENTED_LOCAL` |
| POST/PATCH | `/v1/shops/{shopId}/listings...` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/admin/listings/reviews`, `/v1/admin/listings/{id}/decision` | `IMPLEMENTED_LOCAL` · AAL2 |

Package public response chỉ trả disclosure, seal, manifest allowlist và `availableQuantity`; không trả tracking/source/internal package-line ID.

## Commerce, finance và fulfillment

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/v1/checkout/init` | `SANDBOX_ONLY` |
| POST | `/v1/checkout/{orderId}/pay` (`SANDBOX_COD`) | `SANDBOX_ONLY` |
| GET | `/v1/orders`, `/v1/orders/{id}`, `/v1/shops/{shopId}/orders` | `IMPLEMENTED_LOCAL` |
| GET | `/v1/shops/{shopId}/finance`, `/finance/projection` | `SANDBOX_ONLY` · ledger-derived |
| POST | `/v1/shops/{shopId}/orders/{orderId}/shipment` | `SANDBOX_ONLY` |
| POST | `/v1/sandbox/fulfillment/orders/{orderId}/events`, `/complete` | `SANDBOX_ONLY` · route không tồn tại ở production |

Checkout chỉ nhận một package quantity 1. Backend re-read price/shop/package/address, snapshot dữ liệu, reserve 30 phút, tạo double-entry hold và outbox trong transaction. Payment thật, top-up, withdrawal, payout và bank reconciliation là `BLOCKED_PROVIDER`.

## Claims, evidence và refund

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/v1/orders/{orderId}/disputes` | `SANDBOX_ONLY` |
| POST | `/v1/processing-records` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/disputes/{caseId}/evidence` | `SANDBOX_ONLY` · metadata/version/hash |
| POST | `/v1/disputes/{caseId}/replies`, `/appeal` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/admin/disputes`, `/v1/admin/disputes/{caseId}/decision` | `SANDBOX_ONLY` · AAL2 |

Evidence là optional. Seller chỉ nhận derivative metadata. Refund dừng ở obligation (`PAYOUT_READY`, `WAITING_*`, `SELLER_ACTION_REQUIRED`); schema không cho `PAID/VERIFIED` khi payment disabled.

## Account, operations và public legal

| Method | Path | Trạng thái |
|---|---|---|
| GET/POST/DELETE | `/v1/account/addresses...` | `IMPLEMENTED_LOCAL` |
| POST | `/v1/account/change-password` | `IMPLEMENTED_LOCAL` · verify current password first |
| GET/PATCH | `/v1/notifications...` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/legal/{slug}`, `/v1/legal/{slug}/accept` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/support/tickets...`, `/v1/admin/support/tickets...` | `IMPLEMENTED_LOCAL` |
| GET/POST | `/v1/privacy/requests...` | `SANDBOX_ONLY` · AAL2 |

Forgot/reset password dùng Supabase Auth trực tiếp ở web. Social login được disable và ghi “Sắp có”.

## Contract và kiểm tra drift

Contract machine-readable nằm ở `packages/api-client/openapi/reboxe.yaml`; generated types ở `packages/api-client/src/generated.ts`.

```bash
corepack pnpm --filter @reboxe/api-client generate
git diff --exit-code -- packages/api-client/src/generated.ts
```

CI đã chạy đúng cặp lệnh trên. Khi thêm route phải cập nhật controller, Zod validation, OpenAPI, API client, authorization/IDOR test và catalog trong cùng diff.
