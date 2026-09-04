import { expect, test } from "@playwright/test";

const shopId = "RBX-01JTESTVERIFIED0000000000";

test("chooses a category, edits a draft and sends it to policy review", async ({ page }) => {
  const listings: Array<Record<string, unknown>> = [];
  let updateBody: Record<string, unknown> | undefined;
  let failNextUpdate = true;
  let uploadKey = "";

  await page.route("https://storage.test/**", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({ status: 200, json: { Key: uploadKey } });
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    ) });
  });

  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path === "/v1/categories" && method === "GET") {
      await route.fulfill({ json: [
        { id: "fashion", name: "Thời trang" },
        { id: "cosmetics", name: "Mỹ phẩm" }
      ] });
      return;
    }

    if (path === "/v1/me") {
      await route.fulfill({ json: {
        id: "10000000-0000-4000-8000-000000000001",
        profileStatus: "ACTIVE",
        shops: [{
          id: shopId,
          displayName: "REBOX Verified Fixture",
          role: "OWNER",
          membershipStatus: "ACTIVE",
          kycStatus: "VERIFIED",
          status: "ACTIVE"
        }]
      } });
      return;
    }

    if (path === `/v1/shops/${shopId}/listings` && method === "GET") {
      await route.fulfill({ json: listings });
      return;
    }

    if (path === `/v1/shops/${shopId}/listings` && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      listings.unshift({
        ...body,
        id: "RBX-01JTESTEDITDRAFT000000000",
        shopId,
        shopDisplayName: "REBOX Verified Fixture",
        images: [],
        status: "DRAFT",
        publishedAt: null,
        createdAt: "2026-09-02T00:00:00.000Z"
      });
      await route.fulfill({ status: 201, json: listings[0] });
      return;
    }

    if (path === `/v1/shops/${shopId}/listings/RBX-01JTESTEDITDRAFT000000000` && method === "PATCH") {
      updateBody = request.postDataJSON() as Record<string, unknown>;
      if (failNextUpdate) {
        failNextUpdate = false;
        await route.fulfill({ status: 409, json: {
          error: { code: "INVALID_LISTING_STATE", message: "Synthetic retry", requestId: "e2e-retry" }
        } });
        return;
      }
      listings[0] = { ...listings[0], ...updateBody };
      await route.fulfill({ json: listings[0] });
      return;
    }

    if (path.endsWith("/images/init") && method === "POST") {
      uploadKey = `catalog/${shopId}/RBX-01JTESTEDITDRAFT000000000/image.png`;
      await route.fulfill({ status: 201, json: {
        key: uploadKey,
        uploadUrl: `https://storage.test/${uploadKey}`,
        expiresAt: "2026-09-04T12:00:00.000Z",
        headers: { "content-type": "image/png" }
      } });
      return;
    }

    if (path.endsWith("/images/complete") && method === "POST") {
      listings[0] = {
        ...listings[0],
        images: [{ key: uploadKey, url: `https://storage.test/public/${uploadKey}`, width: 1, height: 1 }]
      };
      await route.fulfill({ status: 201, json: listings[0] });
      return;
    }

    if (path.endsWith("/publish") && method === "POST") {
      listings[0] = { ...listings[0], status: "PENDING_REVIEW" };
      await route.fulfill({ status: 201, json: {
        listing: listings[0],
        policy: {
          outcome: "PENDING_REVIEW",
          policyLevel: "MANUAL_REVIEW",
          policyVersion: "2026-08-25-dev",
          message: "Listing is pending manual review"
        }
      } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: { code: "RESOURCE_NOT_FOUND", message: "Not found", requestId: "e2e" } } });
  });

  await page.goto("/seller/inventory");
  await page.getByLabel("Tên sản phẩm *").fill("Draft E2E ban đầu");
  await page.getByLabel("Danh mục *").selectOption("cosmetics");
  await page.getByLabel("Giá bán dự kiến (VNĐ) *").fill("120000");
  await page.getByLabel("Khối lượng (gram) *").fill("500");
  await page.getByLabel("Mô tả tình trạng và khuyết điểm *").fill("Xước nhẹ ở khóa kéo");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã lưu bản nháp.");

  await page.getByLabel("Thêm ảnh cho Draft E2E ban đầu").setInputFiles({
    name: "catalog.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
  });
  await expect(page.getByRole("status")).toHaveText("Đã thêm ảnh sản phẩm.");
  await expect(page.getByRole("row", { name: /Draft E2E ban đầu/ })).toContainText("1/6 ảnh");

  await page.getByRole("row", { name: /Draft E2E ban đầu/ }).getByRole("button", { name: "Chỉnh sửa" }).click();
  await page.getByLabel("Tên sản phẩm *").fill("Draft E2E đã sửa");
  await page.getByLabel("Giá bán dự kiến (VNĐ) *").fill("135000");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Dữ liệu bạn vừa nhập vẫn được giữ nguyên" })).toBeVisible();
  await expect(page.getByLabel("Tên sản phẩm *")).toHaveValue("Draft E2E đã sửa");
  await expect(page.getByLabel("Giá bán dự kiến (VNĐ) *")).toHaveValue("135000");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã cập nhật bản nháp.");
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).toContainText("135.000đ");
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).toContainText("1/6 ảnh");

  expect(updateBody).toEqual({
    title: "Draft E2E đã sửa",
    description: "",
    categoryId: "cosmetics",
    conditionGrade: "NEW_SEALED",
    conditionNotes: "Xước nhẹ ở khóa kéo",
    price: 135_000,
    weightGram: 500
  });

  await page.reload();
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).toContainText("135.000đ");

  await page.getByRole("row", { name: /Draft E2E đã sửa/ }).getByRole("button", { name: "Đăng bán" }).click();
  await expect(page.getByRole("status")).toHaveText("Sản phẩm đã được gửi duyệt và chưa xuất hiện công khai.");
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).toContainText("Chờ duyệt");
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).not.toContainText("Xem công khai");
});
