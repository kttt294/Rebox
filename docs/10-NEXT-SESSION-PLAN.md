# REBOX — Kế hoạch hoàn thiện giỏ hàng và checkout COD

> Cập nhật ngày 07/09/2026 sau khi kiểm tra luồng buyer thực tế. Kế hoạch này thay thế kế hoạch shop review trước đó, vì phần verified shop review đã được triển khai. Mục tiêu mới là sửa invariant giỏ hàng, làm E2E ổn định và triển khai checkout COD đúng mô hình một listing = một kiện hoàn.

## 1. Kết quả kiểm tra hiện tại

Đang hoạt động:

- Trang chi tiết đọc được listing `ACTIVE` từ public API.
- `Thêm vào giỏ hàng` lưu listing vào `localStorage`.
- Trang giỏ tải lại listing, cho chọn sản phẩm và tính tổng tạm tính.
- `Mua hàng` từ giỏ và `Mua ngay` từ chi tiết đều mở `/checkout?items=...`.
- Trang checkout hiển thị đúng listing và tạm tính.
- `corepack pnpm --filter @rebox/web typecheck` đang pass.

Chưa hoàn thiện hoặc đang sai:

- `addCartItem` tăng `quantity` khi thêm lại cùng listing; trang giỏ còn có nút tăng/giảm số lượng. Điều này sai invariant một listing bán đúng một kiện, quantity luôn bằng `1`.
- Giỏ có thể chọn nhiều listing rồi truyền nhiều ID sang checkout, trong khi MVP chỉ cho checkout đúng một package.
- Checkout đang tin quantity từ `localStorage`; dữ liệu client không được dùng làm authority nghiệp vụ.
- Checkout chỉ là preview frontend. Chưa có địa chỉ, phí vận chuyển, tạo order, reservation, fund hold, chọn COD hoặc xác nhận đặt hàng.
- Bảng `listings` hiện chưa có liên kết trực tiếp tới `return_packages`; chưa thể khóa đúng kiện dưới transaction khi checkout.
- Codebase chưa có ledger kép và `fund_holds`; chưa đủ điều kiện triển khai checkout thật theo flow canonical.
- `purchase_orders` hiện là bảng nhẹ phục vụ account/review demo, không thay thế aggregate `orders + sub_orders + sub_order_items` trong technical spec.
- Test `adds a database listing to cart and opens checkout preview` phụ thuộc fixture cố định `RBX-01JTESTCATALOG-TECH-001`. Fixture có trong `db/seeds/sprint1.sql` nhưng không tồn tại trong database đang chạy, nên test chờ nút 30 giây rồi timeout thay vì báo lỗi setup rõ ràng.

## 2. Mục tiêu và định nghĩa hoàn thành

Luồng cần đạt:

```text
Chi tiết listing ACTIVE/package AVAILABLE
→ thêm vào giỏ, thêm lại vẫn chỉ có một dòng quantity 1
→ chọn đúng một listing để checkout
→ chọn địa chỉ của buyer
→ backend khóa listing + ReturnPackage và tính phí từ dữ liệu server
→ tạo order RESERVED + đúng một sub-order + snapshot item/fee + fund hold
→ buyer chọn COD
→ backend kiểm tra eligibility/risk và chuyển đơn sang CONFIRMED/COD_PENDING
→ ReturnPackage chuyển RESERVED → SOLD
→ UI hiện trang đặt hàng thành công và giỏ bỏ listing vừa mua
```

Hoàn thành kỹ thuật khi:

- Hai tab cùng mua một listing chỉ có một request thành công.
- Mọi tầng đều ép `quantity = 1`; sửa `localStorage` hoặc request thủ công không bypass được backend.
- Checkout nhiều package trả `422 ONE_PACKAGE_PER_CHECKOUT`.
- Buyer không sở hữu địa chỉ nhận `404` hoặc `403`, không lộ dữ liệu địa chỉ.
- Giá, shop, package, phí và tổng tiền đều được backend đọc/tính lại và snapshot.
- Retry cùng `Idempotency-Key` không tạo order/hold thứ hai.
- COD thành công tạo đúng một order, một sub-order, một item và một active hold.
- Test unit/integration/E2E mới pass ổn định trên database được chuẩn bị theo một lệnh rõ ràng.

## 3. Ranh giới an toàn

- Không chỉ bật nút `Đặt hàng` ở frontend khi backend chưa có transaction reservation và hold.
- Không mở checkout thật trước khi lát ledger/fund hold tối thiểu đã pass test cân sổ và concurrency.
- Không dùng `purchase_orders` làm aggregate checkout mới. Có thể giữ nó tạm thời như read model/demo cho account và review, sau đó chuyển projection sang `orders/sub_orders`.
- Không tin `price`, `quantity`, `shopId`, phí, địa chỉ dạng text hoặc trạng thái do frontend gửi.
- Không cho checkout listing không gắn `ReturnPackage`; fixture E2E phải là package-backed listing.
- COD trong local/test dùng fake carrier và fake risk inputs. Không tạo vận đơn thật hoặc xử lý tiền thật trước khi hợp đồng ĐVVC, settlement mode và beneficiary được phê duyệt.
- Production COD vẫn bị chặn cho đến khi chốt luồng ĐVVC chi hộ, đối soát gross/net/deduction và các gate pháp lý liên quan.

## 4. Thứ tự triển khai đề xuất

Làm theo 5 session nhỏ. Không gộp toàn bộ checkout vào một diff.

### Session A — Sửa invariant giỏ hàng và làm E2E deterministic

#### A1. Chuẩn hóa dữ liệu giỏ

File chính:

- `apps/web/src/features/cart-storage.ts`
- `apps/web/src/app/cart/page.tsx`
- `apps/web/src/features/checkout-preview.tsx`

Thay đổi tối thiểu:

1. Giữ shape `{ listingId, quantity }` để không phải migration storage phức tạp, nhưng mọi hàm đọc/ghi đều normalize `quantity` về `1`.
2. `addCartItem(listingId)` trở thành idempotent: nếu listing đã có thì không tăng số lượng và không thêm dòng trùng.
3. `readCart()` loại dòng hỏng, deduplicate theo `listingId` và trả quantity `1`.
4. `writeCart()` cũng deduplicate/normalize để mọi caller đi qua cùng invariant.
5. Xóa nút `+`/`−` và hàm `changeQuantity`; chỉ hiển thị `Số lượng: 1`.
6. Checkout preview luôn hiển thị quantity `1`, không lấy quantity từ `localStorage`.

Không cần tạo cart backend trong session này.

#### A2. Chỉ cho chọn một listing để checkout

- Giỏ vẫn được lưu nhiều listing để buyer xem lại.
- UI chỉ cho chọn một listing tại một thời điểm; ưu tiên radio hoặc selection state đơn thay vì mảng checkbox.
- Bỏ `Chọn tất cả` vì trái với checkout một package của MVP.
- CTA `Mua hàng` chỉ truyền đúng một `listingId`.
- `Mua ngay` tiếp tục truyền đúng listing hiện tại.

#### A3. Sửa E2E fixture

Nguyên nhân cần xử lý: test đang phụ thuộc trạng thái database bên ngoài nhưng không có preflight/setup đảm bảo fixture đã được seed.

Giải pháp khuyến nghị:

1. Tách helper E2E tạo và publish một listing synthetic qua API từ flow đã có ở cuối `storefront.spec.ts`.
2. Cart test tự tạo listing của chính nó rồi dùng ID trả về, thay vì hardcode `RBX-01JTESTCATALOG-TECH-001`.
3. Khi checkout package-backed được triển khai, helper phải tạo/import `ReturnPackage` trước rồi tạo listing gắn package; không dùng listing thủ công không có package.
4. Nếu chưa tách helper ngay, thêm preflight đọc fixture và fail sớm với thông báo yêu cầu chạy `corepack pnpm db:seed`; đây chỉ là bước tạm, không phải đích cuối.
5. Không đổi test sang một ID demo khác chỉ để hết fail vì vẫn giữ cùng coupling với seed ngoài test.

Test bắt buộc cho Session A:

- Thêm cùng listing hai lần → giỏ có một dòng, quantity `1`.
- `localStorage` chứa quantity `5` hoặc dòng trùng → khi đọc được normalize về một dòng quantity `1`.
- Không còn nút tăng/giảm số lượng.
- Giỏ có hai listing → chỉ một listing được chọn để checkout.
- `Mua hàng` từ giỏ và `Mua ngay` đều tới checkout với đúng một ID.
- Cart E2E không phụ thuộc fixture tồn tại từ một lần seed trước.

### Session B — Nối listing với package và dựng nền commerce

#### B1. Migration inventory linkage

Migration dự kiến kế tiếp là `0013_checkout_cod.sql`, nhưng phải kiểm tra `db/migrations/meta/_journal.json` trước khi đặt số.

Thêm:

```text
listings.return_package_id TEXT NULL REFERENCES return_packages(id)
UNIQUE (return_package_id) WHERE return_package_id IS NOT NULL
return_packages.reserved_until TIMESTAMPTZ NULL
```

Quy tắc:

- Listing package-backed khi publish phải có đúng một `return_package_id` thuộc cùng shop.
- Một package có tối đa một listing hiệu lực.
- Checkout từ chối listing không có package bằng error rõ ràng, không tự tạo package ngầm.
- Cập nhật seed bằng package synthetic và liên kết các listing dùng cho checkout/E2E.
- Không backfill package giả cho dữ liệu không xác định được nguồn.

#### B2. Aggregate commerce canonical

Thêm module `commerce` tối thiểu trong backend và các bảng canonical cần cho vertical slice:

- `orders`
- `sub_orders`, unique `order_id` cho quan hệ một-một MVP
- `sub_order_items`, unique `return_package_id`
- `fund_holds`
- ledger tối thiểu theo thiết kế Sprint 3: `ledger_transactions` và `ledger_postings`

Không thêm shipment/dispute/refund trong migration đầu nếu COD confirmation chưa dùng tới chúng.

Snapshot bắt buộc:

- Item: listing ID, package ID, title, ảnh, tình trạng, giá.
- Địa chỉ: dữ liệu mã hóa + hash; không chỉ lưu `addressId` vì địa chỉ có thể đổi sau khi đặt.
- Fee: input, output, breakdown, config version/effective time.
- Shop/payment method/status theo state machine canonical.

#### B3. Ledger và hold trước checkout

Không tự viết số dư trực tiếp. Tạo một interface ghi sổ duy nhất:

- `HOLD_CREATE`
- `HOLD_RELEASE`
- sau này mới thêm capture/settlement nếu chưa cần cho COD confirmation.

Test bắt buộc:

- Mỗi transaction tổng debit = tổng credit.
- Retry cùng idempotency key chỉ tạo một transaction/hold.
- Số dư khả dụng không âm.
- Hai checkout cạnh tranh không double hold.
- Release hold hết hạn chỉ chạy một lần.

### Session C — Checkout init và trang xác nhận thật

#### C1. Contract/API

Thêm shared schema, OpenAPI, generated client và API client cho:

```http
POST /v1/checkout/init
Idempotency-Key: <client UUID>

{
  "items": [{ "listingId": "...", "quantity": 1 }],
  "addressId": "..."
}
```

Response tối thiểu:

```ts
type CheckoutInitResponse = {
  orderId: string;
  subOrderId: string;
  status: "RESERVED";
  item: CheckoutItemSnapshot;
  feeBreakdown: FeeBreakdown;
  buyerPayable: number;
  expiresAt: string;
};
```

Error tối thiểu:

- `ONE_PACKAGE_PER_CHECKOUT`
- `MULTI_SELLER_CHECKOUT_NOT_SUPPORTED`
- `ITEM_BEING_PURCHASED`
- `ITEM_SOLD`
- `SHOP_UNAVAILABLE`
- `ADDRESS_NOT_FOUND`
- `INSUFFICIENT_SHOP_FUNDS`
- `IDEMPOTENCY_CONFLICT`

#### C2. Transaction checkout init

Trong một transaction và đúng lock order canonical:

```text
wallet → shop → listing → ReturnPackage → order → sub_order → fund_hold
```

Backend phải:

1. Lấy actor từ JWT và xác nhận địa chỉ thuộc actor.
2. Chỉ nhận đúng một item, quantity đúng `1`.
3. Re-read listing, shop, package, giá và trạng thái dưới lock.
4. Yêu cầu shop `ACTIVE`, KYC `VERIFIED`, không debt/block.
5. Yêu cầu listing `ACTIVE`, package `AVAILABLE`.
6. Tính phí server-side và snapshot cấu hình.
7. Tạo hold TTL 30 phút.
8. Tạo order + đúng một sub-order + một item snapshot.
9. Chuyển listing/package sang `RESERVED`, ghi `reserved_until` và outbox expiry.
10. Commit rồi trả breakdown; mọi lỗi rollback toàn bộ.

#### C3. UI checkout

Thay `CheckoutPreview` bằng checkout có state rõ ràng:

- Bắt buộc đăng nhập; giữ return URL để quay lại sau login.
- Tải danh sách địa chỉ qua API hiện có.
- Chọn/tạo địa chỉ; chưa có địa chỉ thì CTA dẫn tới account address.
- Chỉ hiển thị giá ước tính trước init; sau init hiển thị snapshot/backend total.
- Hiển thị countdown `expiresAt` và trạng thái hết hạn.
- Không tự tính phí nghiệp vụ trong React component.
- Khi init lỗi sold/reserved, thông báo rõ và đưa buyer về giỏ.

### Session D — Chọn COD và xác nhận đặt hàng

#### D1. API chọn COD

Thêm:

```http
POST /v1/checkout/{orderId}/pay
Idempotency-Key: <client UUID>

{ "method": "COD" }
```

Chỉ owner của order được gọi. Backend khóa lại toàn bộ aggregate và yêu cầu:

- order/sub-order đang `RESERVED`;
- hold còn hiệu lực;
- payment method chưa chốt hoặc đã là `COD` do retry cùng request;
- listing/package vẫn gắn đúng order;
- carrier/fake carrier hỗ trợ COD cho địa chỉ snapshot.

Risk policy phải nằm ở backend và có versioned config. Các ngưỡng đang ghi trong `docs/02-BACKEND-FLOWS.md` chỉ được code khi Business/Legal xác nhận là cấu hình hiện hành; không hardcode trong UI.

Khi đủ điều kiện, cùng transaction:

```text
orders.payment_method = COD
sub_orders.status = CONFIRMED
sub_orders.payment_status = COD_PENDING
listings.status = SOLD
return_packages.inventory_status = SOLD
fund hold vẫn ACTIVE
outbox ghi sự kiện ORDER_COD_CONFIRMED
```

Response trả order summary và không chứa PII thô không cần thiết.

#### D2. UI xác nhận COD

- Hiển thị phương thức `Thanh toán khi nhận hàng (COD)`.
- Buyer phải chủ động chọn COD và bấm `Đặt hàng`.
- Disable nút trong lúc request; retry dùng cùng idempotency key.
- Không optimistic-success trước response backend.
- Thành công chuyển tới `/account/orders/{subOrderId}` hoặc trang success tối thiểu.
- Xóa đúng listing vừa mua khỏi cart sau khi backend xác nhận; không xóa trước.
- Nếu COD bị từ chối, giữ reservation cho phép chọn phương thức khác khi có, hoặc cho buyer hủy/đợi expiry; không tự đánh dấu SOLD.

#### D3. Projection lịch sử đơn

- Chuyển `GET /v1/account/orders` đọc từ aggregate canonical hoặc một projection được cập nhật cùng transaction/outbox.
- Giữ review eligibility hoạt động với order `COMPLETED` của đúng shop.
- Nếu giữ `purchase_orders` làm read model tạm thời, phải ghi rõ owner/sync mechanism và có test; không dual-write rời rạc từ controller.

### Session E — Timeout, concurrency và E2E hoàn chỉnh

#### E1. Worker reservation expiry

- Worker claim outbox/job idempotently.
- Khi quá 30 phút và order vẫn `RESERVED`: chuyển `EXPIRED`, trả listing/package về khả dụng và `HOLD_RELEASE`.
- Nếu order đã `CONFIRMED`, worker không được release.
- Retry job không tạo posting thứ hai.

#### E2. E2E buyer journey

Tách các test độc lập, mỗi test tự chuẩn bị dữ liệu synthetic:

1. Xem chi tiết → thêm giỏ → thêm lại không tăng quantity.
2. Giỏ → chọn một listing → checkout → chọn địa chỉ → COD → success.
3. Chi tiết → Mua ngay → checkout → COD → success.
4. Hai browser context cùng mua một listing → một success, một `ITEM_BEING_PURCHASED/ITEM_SOLD`.
5. Sửa `localStorage` quantity `5` → UI normalize, backend vẫn chỉ tạo một item quantity `1`.
6. Gửi request hai item → `422 ONE_PACKAGE_PER_CHECKOUT`.
7. Dùng address của buyer khác → bị từ chối.
8. Retry init/pay cùng key → cùng kết quả, không thêm order/hold.
9. Reservation hết hạn → listing mua lại được.

Không dùng test timeout để biểu diễn thiếu fixture. Setup lỗi phải fail sớm trong vài giây với thông báo cụ thể.

## 5. File dự kiến thay đổi

### Session A

- `apps/web/src/features/cart-storage.ts`
- `apps/web/src/app/cart/page.tsx`
- `apps/web/src/features/checkout-preview.tsx`
- `apps/web/e2e/storefront.spec.ts`
- Có thể thêm đúng một helper trong `apps/web/e2e/` nếu được dùng bởi ít nhất hai test.

### Session B–E

- `packages/backend/src/platform/database/schema.ts`
- `db/migrations/<next>_checkout_cod.sql`
- `db/migrations/meta/_journal.json`
- `db/seeds/sprint1.sql`
- `db/seeds/finance-demo.sql` khi demo UI cần package-backed listing
- `packages/backend/src/modules/commerce/`
- `packages/backend/src/index.ts`
- `apps/api/src/http/controllers/checkout.controller.ts`
- `apps/api/src/app.module.ts` hoặc provider registration hiện hành
- `apps/worker/src/outbox.consumer.ts`
- `packages/shared/src/commerce.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/index.ts`
- `packages/api-client/openapi/rebox.yaml`
- `packages/api-client/src/generated.ts`
- `packages/api-client/src/index.ts`
- `apps/web/src/app/checkout/page.tsx`
- `apps/web/src/features/checkout-preview.tsx` — có thể đổi tên khi không còn là preview
- `apps/web/src/app/account/` cho order success/detail nếu cần
- Test nhỏ tương ứng trong `packages/shared/test`, `packages/backend/test` và `apps/web/e2e`.

Không tạo file trong danh sách chỉ vì kế hoạch nêu tên; trước mỗi session phải reuse module/helper/pattern đang có nếu phù hợp.

## 6. Ma trận test backend tối thiểu

| Tình huống | Kết quả |
|---|---|
| quantity `0`, `2`, số thập phân hoặc thiếu | `422`, không tạo dữ liệu |
| hai item dù cùng shop | `422 ONE_PACKAGE_PER_CHECKOUT` |
| listing không gắn package | checkout bị từ chối |
| listing không `ACTIVE` | `409 ITEM_SOLD` hoặc state error phù hợp |
| package không `AVAILABLE` | `409 ITEM_BEING_PURCHASED/ITEM_SOLD` |
| shop inactive/KYC chưa verified/debt/block | `409 SHOP_UNAVAILABLE` |
| address không thuộc actor | từ chối, không lộ địa chỉ |
| giá client giả | bị bỏ qua; dùng giá database |
| hai request đồng thời cho cùng package | đúng một order thắng |
| retry cùng key + cùng payload | trả cùng kết quả |
| cùng key + payload khác | `409 IDEMPOTENCY_CONFLICT` |
| COD trên order hết hạn | từ chối, không SOLD |
| COD hợp lệ | `CONFIRMED + COD_PENDING + SOLD`, hold còn active |
| expiry chạy sau COD confirmed | không release hold/package |

## 7. Lệnh kiểm tra sau từng session

Trước khi chạy E2E, bảo đảm Supabase local/API/web đang chạy và chỉ dùng dữ liệu synthetic.

```bash
git status --short
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
git diff --check
```

Trong lúc phát triển, ưu tiên vòng lặp nhỏ:

```bash
corepack pnpm --filter @rebox/web typecheck
corepack pnpm test:e2e --grep "cart|checkout|COD"
corepack pnpm --filter @rebox/backend test
```

Nếu migration thay đổi:

```bash
corepack pnpm db:migrate
corepack pnpm db:seed
```

Không tự chạy `db:reset` trên database có dữ liệu cần giữ. Chỉ reset local synthetic khi đã xác nhận đúng target.

## 8. Ngoài phạm vi của vertical slice COD đầu tiên

- VietQR, bank webhook và seller confirm payment.
- ĐVVC production, tạo/in nhãn thật và webhook tracking thật.
- Đối soát COD production, `COD_REMITTED`, gross/net/deduction và settlement ledger đầy đủ.
- Refund, dispute, return shipment và payout.
- Multi-package hoặc multi-seller checkout.
- Voucher, loyalty, nhiều đơn vị tiền tệ và lưu thẻ.
- Tự động bật production payment/shipping trước các gate hợp đồng và pháp lý.

Các phần trên tiếp tục theo Sprint 4–6 trong `docs/04-IMPLEMENTATION-PLAN.md`; không nhét vào diff checkout COD đầu tiên.

## 9. Prompt bắt đầu Session A

```text
Làm việc trong repo /Users/minhsang/Rebox và thực hiện Session A trong
docs/10-NEXT-SESSION-PLAN.md.

Mục tiêu duy nhất của session này:
1. Mọi listing trong cart luôn có quantity = 1; thêm lại không tăng số lượng.
2. Bỏ nút +/- và chỉ cho chọn đúng một listing để checkout.
3. Checkout preview không tin quantity từ localStorage.
4. Sửa cart E2E để không phụ thuộc âm thầm vào fixture
   RBX-01JTESTCATALOG-TECH-001 có sẵn trong database.

Chưa xây checkout backend, order, ledger, COD hoặc shipping trong Session A.

Trước khi sửa:
- chạy git status và giữ nguyên mọi thay đổi hiện có;
- đọc cart-storage.ts, cart/page.tsx, checkout-preview.tsx,
  storefront.spec.ts và flow publish listing hiện có;
- nêu vòng lặp test red/green ngắn.

Test bắt buộc:
- thêm cùng listing hai lần vẫn một dòng quantity 1;
- localStorage quantity 5/dòng trùng được normalize;
- không còn nút tăng giảm;
- giỏ hai listing chỉ checkout một listing;
- mua từ giỏ và Mua ngay vẫn mở đúng listing;
- test E2E fail nhanh, rõ nếu setup hỏng và pass khi tự chuẩn bị fixture;
- lint, typecheck, test liên quan và git diff --check pass.
```

## 10. Prompt bắt đầu Session B sau khi Session A pass

```text
Làm việc trong repo /Users/minhsang/Rebox và thực hiện Session B trong
docs/10-NEXT-SESSION-PLAN.md.

Mục tiêu: tạo nền backend an toàn cho checkout package-backed, gồm liên kết
listing → ReturnPackage, aggregate orders/sub_orders/sub_order_items và lát
ledger/fund hold tối thiểu. Chưa mở nút xác nhận COD production.

Tuân thủ lock order và transaction trong docs/02-BACKEND-FLOWS.md; không dùng
purchase_orders làm aggregate checkout; không cho listing thiếu ReturnPackage
đi qua checkout. Viết migration + integration tests trước khi nối UI.
```
