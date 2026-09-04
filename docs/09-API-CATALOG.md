# REBOX API Catalog

Tài liệu này ghi lại **các HTTP API đã được triển khai thực tế** trong REBOX, trạng thái kiểm thử và trạng thái triển khai của chúng.

Không ghi API mới vào danh sách chính chỉ vì API đó xuất hiện trong kế hoạch hoặc technical spec. API chỉ được đánh dấu `IMPLEMENTED` khi đã có controller/service chạy được. API chưa viết phải nằm trong mục **Planned APIs**.

## 1. Nguồn liên quan

| Nội dung | File | Vai trò |
|---|---|---|
| API catalog cho người đọc | `docs/09-API-CATALOG.md` | Danh sách API đã tạo, trạng thái test/deploy và ghi chú nghiệp vụ |
| OpenAPI contract | `packages/api-client/openapi/rebox.yaml` | Mô tả machine-readable về endpoint, request, response và authentication |
| TypeScript types được sinh | `packages/api-client/src/generated.ts` | Types sinh từ OpenAPI; không chỉnh sửa thủ công |
| API client dùng chung | `packages/api-client/src/index.ts` | Lớp gọi HTTP được web/mobile tương lai sử dụng |
| NestJS controllers | `apps/api/src/http/controllers/` | HTTP runtime thực sự nhận request |

Khi thay đổi API, controller, OpenAPI contract, generated types, API client, test và catalog phải được cập nhật trong cùng một thay đổi.

## 2. Trạng thái hiện tại

- Runtime: NestJS HTTP API tại `apps/api`.
- Base URL local mặc định: `http://127.0.0.1:3001`.
- Authentication: Supabase JWT Bearer token, được NestJS kiểm tra qua issuer, audience và JWKS.
- Database đã kiểm thử: Supabase Local/PostgreSQL.
- Supabase Cloud: **chưa kết nối**.
- Cloud API deployment: **chưa triển khai**; hiện chưa có production/staging public URL.
- Dữ liệu trước A14: chỉ synthetic hoặc anonymized.

### Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `PLANNED` | Chỉ có trong kế hoạch, chưa có implementation chạy được |
| `IMPLEMENTED` | Đã có implementation và test local |
| `STAGING` | Đã deploy và smoke test trên staging |
| `PRODUCTION` | Đã deploy production sau khi các gate liên quan được đóng |
| `DEPRECATED` | Không dùng cho consumer mới và có kế hoạch loại bỏ |

## 3. API đã được tạo

Hiện có **13 endpoint**, đều ở trạng thái `IMPLEMENTED` trên local.

| Method | Path | Auth | Module | Trạng thái | Mục đích |
|---|---|---|---|---|---|
| `GET` | `/health/live` | Public | Platform | `IMPLEMENTED` | Kiểm tra process API còn hoạt động |
| `GET` | `/health/ready` | Public | Platform | `IMPLEMENTED` | Kiểm tra API kết nối được PostgreSQL |
| `GET` | `/v1/me` | Supabase JWT | Identity | `IMPLEMENTED` | Lấy actor hiện tại và danh sách shop membership |
| `GET` | `/v1/categories` | Public | Inventory | `IMPLEMENTED` | Lấy danh mục active, không bị cấm, dùng cho seller picker |
| `POST` | `/v1/shops` | Supabase JWT | Identity | `IMPLEMENTED` | Tạo profile/shop và membership `OWNER` trong transaction |
| `GET` | `/v1/shops/{shopId}/listings` | Supabase JWT | Inventory | `IMPLEMENTED` | Lấy listing thuộc shop mà actor có quyền truy cập |
| `POST` | `/v1/shops/{shopId}/listings` | Supabase JWT | Inventory | `IMPLEMENTED` | Tạo manual listing ở trạng thái draft |
| `PATCH` | `/v1/shops/{shopId}/listings/{listingId}` | Supabase JWT | Inventory | `IMPLEMENTED` | Sửa listing thuộc đúng shop khi còn ở trạng thái `DRAFT` |
| `POST` | `/v1/shops/{shopId}/listings/{listingId}/images/init` | Supabase JWT | Inventory | `IMPLEMENTED` | Cấp signed upload URL cho ảnh catalog hợp lệ của draft |
| `POST` | `/v1/shops/{shopId}/listings/{listingId}/images/complete` | Supabase JWT | Inventory | `IMPLEMENTED` | Kiểm tra metadata Storage rồi gắn ảnh vào draft, tối đa 6 ảnh |
| `POST` | `/v1/shops/{shopId}/listings/{listingId}/publish` | Supabase JWT | Inventory | `IMPLEMENTED` | Publish listing và ghi outbox event trong cùng transaction |
| `GET` | `/v1/listings` | Public | Inventory | `IMPLEMENTED` | Tìm listing public bằng cursor, từ khóa, danh mục và sắp xếp |
| `GET` | `/v1/listings/{listingId}` | Public | Inventory | `IMPLEMENTED` | Lấy listing công khai; chỉ trả listing và shop đang active |

## 4. Request chính

### `GET /v1/categories`

Trả `{id, name}[]` đã sắp xếp cho category picker. Không trả policy/version và không trả category có policy `BANNED` đang hiệu lực.

### `POST /v1/shops`

```json
{
  "displayName": "REBOX Synthetic Shop",
  "legalType": "INDIVIDUAL"
}
```

`legalType` nhận một trong:

- `INDIVIDUAL`
- `HOUSEHOLD`
- `ENTERPRISE`

### `POST /v1/shops/{shopId}/listings`

```json
{
  "title": "Hộp carton tái sử dụng",
  "description": "Fixture synthetic dùng cho dev/staging",
  "categoryId": "home",
  "conditionGrade": "GOOD",
  "conditionNotes": "Đã qua sử dụng, còn nguyên kết cấu",
  "price": 45000,
  "weightGram": 500
}
```

`conditionGrade` nhận một trong:

- `NEW_SEALED`
- `LIKE_NEW_99`
- `GOOD`
- `FAIR`
- `DEFECT`

### `PATCH /v1/shops/{shopId}/listings/{listingId}`

Dùng cùng payload editable với API tạo draft. Request không nhận các field do server sở hữu như `shopId`, `status`, `priceSource` hoặc ownership. Chỉ listing `DRAFT` thuộc đúng shop mới được cập nhật.

### `POST /v1/shops/{shopId}/listings/{listingId}/images/init`

```json
{
  "mimeType": "image/webp",
  "sizeBytes": 42000
}
```

API chỉ nhận `image/jpeg`, `image/png`, `image/webp`, kích thước từ 1 byte đến 5 MiB. Listing phải thuộc đúng shop, còn `DRAFT` và chưa đủ 6 ảnh. Response trả key do server sinh, signed upload URL có hạn và các header cần gửi khi `PUT` bytes trực tiếp lên Supabase Storage:

```json
{
  "key": "catalog/RBX-SHOP/RBX-LISTING/01K....webp",
  "uploadUrl": "https://PROJECT.supabase.co/storage/v1/object/upload/sign/catalog-media/...",
  "expiresAt": "2026-09-04T09:00:00.000Z",
  "headers": {
    "content-type": "image/webp"
  }
}
```

### `POST /v1/shops/{shopId}/listings/{listingId}/images/complete`

```json
{
  "key": "catalog/RBX-SHOP/RBX-LISTING/01K....webp"
}
```

Backend xác minh lại membership, ownership và trạng thái `DRAFT`; key phải nằm đúng namespace shop/listing. Sau đó backend đọc metadata authoritative từ Supabase Storage, kiểm tra MIME, kích thước, định dạng bytes và chiều ảnh trước khi gắn vào `listings.images`. Cập nhật dùng điều kiện atomically nên các request complete đồng thời vẫn không thể vượt quá 6 ảnh. Response là `Listing` đã có `images[].{key,url,width,height}`.

### `POST /v1/shops/{shopId}/listings/{listingId}/publish`

Backend tự lấy policy đang hiệu lực; client không được gửi policy level, version hoặc kết quả moderation. `BANNED` trả `LISTING_CATEGORY_BANNED`, `DISCLOSURE` thiếu mô tả trả `LISTING_DISCLOSURE_REQUIRED`; cả hai giữ listing ở `DRAFT`. `MANUAL_REVIEW` chuyển sang `PENDING_REVIEW` và phát `listing.pending_review`; chỉ listing hợp lệ chuyển `ACTIVE` và phát `listing.published`. Version và rule snapshot đã áp dụng được lưu cùng listing.

Manual listing có `priceSource=SELLER_DECLARED` vẫn phải có ít nhất một ảnh. Thiếu ảnh trả `LISTING_IMAGE_REQUIRED` và không tạo outbox event.

### `GET /v1/listings`

Query hỗ trợ `cursor`, `q`, `category`, `shopId` và `sort=newest|price_asc|price_desc`. API trả tối đa 24 listing mỗi trang cùng `nextCursor`; chỉ listing `ACTIVE` của shop `ACTIVE` xuất hiện. Tìm kiếm dùng PostgreSQL FTS với chuẩn hóa dấu tiếng Việt.

## 5. Authentication và authorization

Endpoint có cột Auth là `Supabase JWT` yêu cầu header:

```http
Authorization: Bearer <supabase-access-token>
```

NestJS xác định actor từ claim `sub` trong JWT. Client không được gửi actor ID thay cho danh tính đã xác thực.

JWT chỉ chứng minh danh tính. Quyền nghiệp vụ vẫn được backend kiểm tra bằng shop membership, role, membership status, KYC status và shop status.

Sửa draft yêu cầu capability `CREATE_LISTING`; `OWNER`, `MANAGER` và `WAREHOUSE` có thể sửa listing `DRAFT` thuộc shop của mình. Listing không thuộc shop trả `404`; listing đã rời trạng thái `DRAFT` trả `INVALID_LISTING_STATE`.

Init/complete ảnh dùng cùng capability và chống IDOR như sửa draft. Trần 6 ảnh được kiểm tra lại trong câu `UPDATE`, không chỉ dựa vào số lượng client gửi hoặc kết quả kiểm tra trước upload.

Publish listing yêu cầu tối thiểu:

- actor có membership hợp lệ trong shop;
- role có capability publish;
- shop có KYC status `VERIFIED`;
- shop status là `ACTIVE`;
- listing thuộc đúng shop.

Shop `PENDING` bị chặn với lỗi nghiệp vụ `SHOP_NOT_VERIFIED`. Truy cập listing/shop không thuộc quyền actor trả `404` để hạn chế lộ tài nguyên.

## 6. OpenAPI có tác dụng gì trong REBOX?

OpenAPI là một chuẩn mô tả HTTP API bằng YAML/JSON để cả con người và công cụ đều đọc được. File hiện tại là:

`packages/api-client/openapi/rebox.yaml`

Trong REBOX, OpenAPI có bốn tác dụng chính:

1. **Định nghĩa contract**: method, path, path parameter, request body, response schema và endpoint nào cần Bearer JWT.
2. **Sinh TypeScript types**: lệnh generate tạo `packages/api-client/src/generated.ts`, giúp API client và consumer phát hiện sai kiểu ngay lúc typecheck.
3. **Giảm lệch frontend/backend**: web gọi qua `packages/api-client`; các kiểu request/response xuất phát từ cùng một contract thay vì frontend tự đoán JSON.
4. **Làm đầu vào cho tài liệu và kiểm thử contract sau này**: Swagger UI, mock server, SDK generation hoặc validation có thể đọc cùng file mà không cần phân tích controller thủ công.

Luồng hiện tại:

```text
OpenAPI YAML
    -> openapi-typescript
    -> generated.ts
    -> @rebox/api-client
    -> apps/web

NestJS controllers + backend modules
    -> triển khai hành vi runtime theo contract
```

Chạy lại code generation:

```powershell
corepack pnpm --filter @rebox/api-client generate
```

OpenAPI **không** tự làm các việc sau:

- không tự tạo hoặc chạy NestJS endpoint;
- không tự triển khai API lên cloud;
- không tự kiểm tra quyền nghiệp vụ hoặc RLS;
- không thay thế integration/E2E test;
- không bảo đảm YAML và runtime luôn khớp nếu CI không có contract test tương ứng.

Vì vậy OpenAPI là **contract**, còn controller/backend là **implementation runtime**.

## 7. Kết quả kiểm thử hiện có

| Nhóm | Kết quả đã xác nhận |
|---|---|
| JWT/JWKS | Token hợp lệ được chấp nhận; sai audience bị từ chối; public route không cần token |
| Identity | Tạo shop/profile/OWNER membership thành công |
| Inventory | VERIFIED publish được khi có ảnh; manual draft thiếu ảnh bị chặn; update draft persist; non-draft bị chặn; IDOR trả `404` |
| Catalog media | Signed upload chạy với Supabase local; complete kiểm tra metadata thật; MIME/kích thước sai bị chặn; 7 complete đồng thời chỉ gắn 6 ảnh |
| Public listing | Search không dấu; draft/shop inactive bị ẩn; active listing mở được bằng SSR và hiển thị ảnh Storage |
| Outbox | Hai worker concurrent không xử lý trùng; runtime xử lý thành `PROCESSED:1` |
| Quality gates | Lint, typecheck, 24 test, build và 7 Playwright E2E đều đạt ở lần kiểm tra gần nhất |

Các kết quả trên là local verification, không phải staging/production verification.

## 8. Planned APIs

Chưa có API payment, wallet, order, fulfillment, claims/evidence production, mobile, AI hoặc live marketplace integration. Catalog media dùng Supabase Storage; pipeline này không được dùng cho evidence WORM.

Không chuyển API planned sang bảng **API đã được tạo** cho đến khi có đủ implementation, authorization, validation và test.

Các production API liên quan tiền thật bị chặn bởi A10. Evidence production bị chặn bởi A12. Production và dữ liệu thật trên Supabase Singapore bị chặn bởi A14.

## 9. Checklist khi thêm hoặc sửa API

- [ ] Xác định module nghiệp vụ sở hữu endpoint.
- [ ] Cập nhật `packages/api-client/openapi/rebox.yaml`.
- [ ] Chạy `corepack pnpm --filter @rebox/api-client generate`.
- [ ] Implement hoặc cập nhật NestJS controller/backend module.
- [ ] Kiểm tra authentication, authorization và chống IDOR.
- [ ] Thêm validation cho input ở trust boundary.
- [ ] Thêm unit/integration/E2E test phù hợp mức rủi ro.
- [ ] Cập nhật API client nếu cần method mới.
- [ ] Cập nhật bảng endpoint và trạng thái deploy trong file này.
- [ ] Chạy lint, typecheck, test và build trước khi merge.

## 10. Lịch sử cập nhật

| Ngày | Thay đổi |
|---|---|
| 2026-09-04 | Hoàn tất API presigned upload/complete ảnh catalog, Supabase Storage adapter, publish image gate và integration/E2E |
| 2026-09-02 | Thêm public catalog/search cursor + PostgreSQL FTS và nối home/search vào API thật |
| 2026-09-02 | Ghi nhận API sửa listing draft, authorization/state guard và kết quả test liên quan |
| 2026-08-25 | Tạo API catalog; ghi nhận 8 endpoint Sprint 1 đã implement và test local |
