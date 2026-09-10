import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

const reviewShopId = "RBX-01JTESTVERIFIED0000000000";
const sellerPassword = "Synthetic-Test-Password-123!";
const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function requireOk(response: APIResponse, step: string) {
  if (!response.ok()) throw new Error(`${step} failed (${response.status()}): ${await response.text()}`);
}

async function createPublishedListing(request: APIRequestContext, prefix: string) {
  const authResponse = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }
      : undefined,
    data: { email: "verified-seller@reboxe.test", password: sellerPassword }
  });
  await requireOk(authResponse, "E2E seller authentication");
  const { access_token: accessToken } = await authResponse.json() as { access_token: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const preflightResponse = await request.get("http://127.0.0.1:3001/v1/account/addresses", { headers });
  await requireOk(preflightResponse, "E2E local setup preflight; configure API for local Supabase and run corepack pnpm db:seed");
  const title = `${prefix} ${crypto.randomUUID()}`;
  const createdResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings`,
    { headers, data: { title, categoryId: "fashion", conditionGrade: "GOOD", conditionNotes: "Synthetic E2E listing", price: 120_000, weightGram: 500 } }
  );
  await requireOk(createdResponse, "E2E listing creation");
  const listing = await createdResponse.json() as { id: string };
  const intentResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/images/init`,
    { headers, data: { mimeType: "image/png", sizeBytes: image.byteLength } }
  );
  await requireOk(intentResponse, "E2E image upload initialization");
  const intent = await intentResponse.json() as { key: string; uploadUrl: string; headers: Record<string, string> };
  const uploadResponse = await request.put(intent.uploadUrl, { headers: intent.headers, data: image });
  await requireOk(uploadResponse, "E2E image upload");
  const completeResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/images/complete`,
    { headers, data: { key: intent.key } }
  );
  await requireOk(completeResponse, "E2E image upload completion");
  const publishResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/publish`,
    { headers }
  );
  await requireOk(publishResponse, "E2E listing publication");

  return { id: listing.id, title };
}

async function authenticate(request: APIRequestContext, email: string) {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }
      : undefined,
    data: { email, password: sellerPassword }
  });
  await requireOk(response, `E2E authentication for ${email}`);
  const { access_token: accessToken } = await response.json() as { access_token: string };
  return { authorization: `Bearer ${accessToken}` };
}

async function createPublishedPackageListing(request: APIRequestContext, prefix: string) {
  const headers = await authenticate(request, "verified-seller@reboxe.test");
  const tracking = `E2E-${crypto.randomUUID()}`.toUpperCase();
  const title = `${prefix} ${crypto.randomUUID()}`;
  const csv = Buffer.from([
    "source_platform,source_order_ref,source_return_ref,source_tracking_no,source_item_ref,source_sku,source_quantity,product_name,variant_name,brand,source_category,original_unit_price_vnd,return_reason_raw,return_reason,returned_at,package_weight_gram,package_length_cm,package_width_cm,package_height_cm,product_image_urls,reboxe_category_id,package_disclosure,outer_package_notes,package_listing_price_vnd",
    `SHOPEE,ORDER-${crypto.randomUUID()},RETURN-${crypto.randomUUID()},${tracking},LINE-1,SKU-1,1,${title},Mẫu test,REBOXE,Danh mục,120000,Đổi ý,CHANGE_MIND,2026-09-07T00:00:00Z,500,20,20,10,https://example.test/item.jpg,fashion,UNOPENED_UNINSPECTED,Seal nguyên,120000`
  ].join("\n"));
  const previewResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/return-imports/preview`,
    { headers, multipart: { file: { name: "e2e.csv", mimeType: "text/csv", buffer: csv } } }
  );
  await requireOk(previewResponse, "E2E package manifest preview");
  const preview = await previewResponse.json() as { batchId: string };
  const commitResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/return-imports/${preview.batchId}/commit`,
    { headers, data: { idempotencyKey: crypto.randomUUID() } }
  );
  await requireOk(commitResponse, "E2E package manifest commit");
  const scanResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/return-packages/scan`,
    {
      headers: { ...headers, "idempotency-key": crypto.randomUUID() },
      data: { scannedCode: tracking, codeType: "TRACKING_NO", platformHint: "SHOPEE" }
    }
  );
  await requireOk(scanResponse, "E2E package scan");
  const { listing } = await scanResponse.json() as { listing: { id: string } };

  const intentResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/images/init`,
    { headers, data: { mimeType: "image/png", sizeBytes: image.byteLength } }
  );
  await requireOk(intentResponse, "E2E package image upload initialization");
  const intent = await intentResponse.json() as { key: string; uploadUrl: string; headers: Record<string, string> };
  await requireOk(await request.put(intent.uploadUrl, { headers: intent.headers, data: image }), "E2E package image upload");
  await requireOk(await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/images/complete`,
    { headers, data: { key: intent.key } }
  ), "E2E package image completion");
  await requireOk(await request.post(
    `http://127.0.0.1:3001/v1/shops/${reviewShopId}/listings/${listing.id}/publish`, { headers }
  ), "E2E package publication");
  return { id: listing.id, title };
}

async function ensureBuyerAddress(request: APIRequestContext) {
  const headers = await authenticate(request, "moderator@reboxe.test");
  const listed = await request.get("http://127.0.0.1:3001/v1/account/addresses", { headers });
  await requireOk(listed, "E2E buyer address lookup");
  if ((await listed.json() as unknown[]).length > 0) return;
  await requireOk(await request.post("http://127.0.0.1:3001/v1/account/addresses", {
    headers,
    data: {
      label: "Nhà synthetic",
      recipientName: "Synthetic Buyer",
      phone: "0901234567",
      addressLine: "123 Đường Synthetic",
      ward: "Phường Test",
      district: "Quận Test",
      province: "Hà Nội",
      isDefault: true
    }
  }), "E2E buyer address creation");
}

async function signInBuyer(page: Page) {
  await page.getByRole("textbox", { name: "Email" }).fill("moderator@reboxe.test");
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill(sellerPassword);
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
}

async function signInAsReviewer(page: Page) {
  const user = {
    id: "10000000-0000-4000-8000-000000000003",
    aud: "authenticated",
    role: "authenticated",
    email: "moderator@reboxe.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: "2026-09-07T00:00:00.000Z",
    updated_at: "2026-09-07T00:00:00.000Z"
  };
  const now = Math.floor(Date.now() / 1000);
  const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", iat: now, exp: now + 3600 })).toString("base64url")}.signature`;
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: route.request().url().endsWith("/user") ? user : {
    access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh-token", user
  } }));
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secure-password");
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
}

async function mockReviewState(page: Page, eligible: boolean) {
  await page.route(`http://127.0.0.1:3001/v1/shops/${reviewShopId}/reviews**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/eligibility")) return route.fulfill({ json: {
      eligible, reason: eligible ? null : "COMPLETED_ORDER_REQUIRED"
    } });
    if (path.endsWith("/mine")) return route.fulfill({ json: null });
    return route.fulfill({ json: [] });
  });
}

test("renders only an active listing through the public NestJS endpoint", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTPUBLICLISTING00000");
  const detail = page.locator("section").filter({ has: page.getByRole("heading", { name: "Áo khoác gió unisex chống nước" }) });
  await expect(detail.getByRole("heading", { name: "Áo khoác gió unisex chống nước" })).toBeVisible();
  await expect(page.getByRole("link", { name: "REBOXE Select", exact: true })).toBeVisible();
  await expect(detail.getByText("120.000đ")).toBeVisible();
  await expect(detail.getByText("Bao bì ngoài có vết cấn nhẹ, chưa mở kiểm tra nội dung")).toBeVisible();
});

test("does not expose a draft listing", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTDRAFTLISTING000000");
  await expect(page.getByRole("heading", { name: "Không tìm thấy listing" })).toBeVisible();
});

test("normalizes the cart and places cart and buy-now sandbox orders", async ({ page, request }) => {
  const first = await createPublishedPackageListing(request, "Cart E2E A");
  const second = await createPublishedPackageListing(request, "Cart E2E B");
  await ensureBuyerAddress(request);

  await page.goto(`/listings/${first.id}`);
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(`/listings/${first.id}`)}`);
  await signInBuyer(page);
  await expect(page).toHaveURL(`/listings/${first.id}`);
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(page.getByRole("button", { name: "Đã thêm vào giỏ" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("reboxe.cart.v1"))).toBe(
    JSON.stringify([{ listingId: first.id, quantity: 1 }])
  );
  await page.evaluate(({ firstId, secondId }) => localStorage.setItem("reboxe.cart.v1", JSON.stringify([
    { listingId: firstId, quantity: 5 },
    { listingId: firstId, quantity: 2 },
    { listingId: secondId, quantity: 7 }
  ])), { firstId: first.id, secondId: second.id });

  await page.goto("/cart");
  await expect(page.getByRole("link", { name: first.title })).toBeVisible();
  await expect(page.getByRole("link", { name: second.title })).toBeVisible();
  await expect(page.getByText("Số lượng: 1")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Tăng số lượng|Giảm số lượng/ })).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(2);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await page.getByRole("radio", { name: `Chọn ${second.title}` }).check();
  await page.getByRole("link", { name: "Mua hàng" }).click();
  await expect(page).toHaveURL(`/checkout?items=${encodeURIComponent(second.id)}`);
  await expect(page.getByRole("heading", { name: "Xác nhận sản phẩm" })).toBeVisible();
  await expect(page.getByRole("link", { name: second.title })).toBeVisible();
  await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt đơn SANDBOX_COD" }).click();
  await expect(page.getByRole("status")).toContainText("đã xác nhận SANDBOX_COD");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("reboxe.cart.v1"))).toBe(
    JSON.stringify([{ listingId: first.id, quantity: 1 }])
  );

  await page.goto(`/listings/${first.id}`);
  await page.getByRole("link", { name: "Mua ngay" }).click();
  await expect(page).toHaveURL(`/checkout?items=${encodeURIComponent(first.id)}`);
  await expect(page.getByRole("link", { name: first.title })).toBeVisible();
  await page.getByRole("button", { name: "Đặt đơn SANDBOX_COD" }).click();
  await expect(page.getByRole("status")).toContainText("đã xác nhận SANDBOX_COD");
});

test("shows the review form only to an eligible buyer", async ({ page }) => {
  await signInAsReviewer(page);
  await mockReviewState(page, true);
  await page.goto(`/shops/${reviewShopId}`);

  await expect(page.getByRole("button", { name: "Gửi đánh giá" })).toBeVisible();
});

test("explains why an ineligible buyer cannot review", async ({ page }) => {
  await signInAsReviewer(page);
  await mockReviewState(page, false);
  await page.goto(`/shops/${reviewShopId}`);

  await expect(page.getByText("Bạn cần hoàn thành một đơn hàng từ shop này để đánh giá.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi đánh giá" })).toHaveCount(0);
});

test("offers login instead of the review form to a guest", async ({ page }) => {
  await page.route(`http://127.0.0.1:3001/v1/shops/${reviewShopId}/reviews**`, (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/reviews")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 401, json: { error: { code: "INVALID_ACCESS_TOKEN", message: "Unauthorized", requestId: "e2e" } } });
  });
  await page.goto(`/shops/${reviewShopId}`);

  await expect(page.getByRole("link", { name: "đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi đánh giá" })).toHaveCount(0);
});

test("finds and opens a listing after the seller publishes it", async ({ page, request }) => {
  const listing = await createPublishedListing(request, "Catalog E2E");

  await page.goto(`/search?q=${encodeURIComponent(listing.title)}`);
  await page.getByRole("link", { name: `Xem ${listing.title}` }).click();
  await expect(page.getByRole("heading", { name: listing.title })).toBeVisible();
  await expect(page.getByRole("img", { name: listing.title })).toBeVisible();
});
