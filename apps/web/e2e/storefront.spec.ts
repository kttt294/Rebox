import { expect, test } from "@playwright/test";

test("renders only an active listing through the public NestJS endpoint", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTPUBLICLISTING00000");
  const detail = page.locator("section").filter({ has: page.getByRole("heading", { name: "Áo khoác hoàn đơn synthetic" }) });
  await expect(detail.getByRole("heading", { name: "Áo khoác hoàn đơn synthetic" })).toBeVisible();
  await expect(page.getByRole("link", { name: "REBOX Verified Fixture", exact: true })).toBeVisible();
  await expect(detail.getByText("120.000đ")).toBeVisible();
  await expect(detail.getByText("Xước nhẹ ở khóa kéo")).toBeVisible();
});

test("does not expose a draft listing", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTDRAFTLISTING000000");
  await expect(page.getByRole("heading", { name: "Không tìm thấy listing" })).toBeVisible();
});

test("adds a database listing to cart and opens checkout preview", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTCATALOG-TECH-001");
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(page.getByRole("button", { name: "Đã thêm vào giỏ" })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("link", { name: "Tai nghe Bluetooth chống ồn" })).toBeVisible();
  await page.getByRole("link", { name: "Mua hàng" }).click();
  await expect(page.getByRole("heading", { name: "Xác nhận sản phẩm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tai nghe Bluetooth chống ồn" })).toBeVisible();
});

test("finds and opens a listing after the seller publishes it", async ({ page, request }) => {
  const authResponse = await request.post("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
    data: { email: "verified-seller@rebox.test", password: "Synthetic-Test-Password-123!" }
  });
  expect(authResponse.ok()).toBe(true);
  const { access_token: accessToken } = await authResponse.json() as { access_token: string };
  const title = `Catalog E2E ${crypto.randomUUID()}`;
  const headers = { authorization: `Bearer ${accessToken}` };
  const createdResponse = await request.post("http://127.0.0.1:3001/v1/shops/RBX-01JTESTVERIFIED0000000000/listings", {
    headers,
    data: {
      title,
      categoryId: "fashion",
      conditionGrade: "GOOD",
      conditionNotes: "Synthetic listing for catalog E2E",
      price: 120_000,
      weightGram: 500
    }
  });
  expect(createdResponse.ok()).toBe(true);
  const listing = await createdResponse.json() as { id: string };
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const intentResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/RBX-01JTESTVERIFIED0000000000/listings/${listing.id}/images/init`,
    { headers, data: { mimeType: "image/png", sizeBytes: image.byteLength } }
  );
  expect(intentResponse.ok()).toBe(true);
  const intent = await intentResponse.json() as { key: string; uploadUrl: string; headers: Record<string, string> };
  const uploadResponse = await request.put(intent.uploadUrl, { headers: intent.headers, data: image });
  expect(uploadResponse.ok()).toBe(true);
  const completeResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/RBX-01JTESTVERIFIED0000000000/listings/${listing.id}/images/complete`,
    { headers, data: { key: intent.key } }
  );
  expect(completeResponse.ok()).toBe(true);
  const publishResponse = await request.post(
    `http://127.0.0.1:3001/v1/shops/RBX-01JTESTVERIFIED0000000000/listings/${listing.id}/publish`,
    { headers }
  );
  expect(publishResponse.ok()).toBe(true);

  await page.goto(`/search?q=${encodeURIComponent(title)}`);
  await page.getByRole("link", { name: `Xem ${title}` }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("img", { name: title })).toBeVisible();
});
