import { expect, test } from "@playwright/test";

const shopId = "RBX-01JTESTVERIFIED0000000000";

test("creates, edits and reloads a listing draft", async ({ page }) => {
  const listings: Array<Record<string, unknown>> = [];
  let updateBody: Record<string, unknown> | undefined;
  let failNextUpdate = true;

  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

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

    await route.fulfill({ status: 404, json: { error: { code: "RESOURCE_NOT_FOUND", message: "Not found", requestId: "e2e" } } });
  });

  await page.goto("/seller/inventory");
  await page.getByLabel("Tên sản phẩm *").fill("Draft E2E ban đầu");
  await page.getByLabel("Mã danh mục *").fill("fashion");
  await page.getByLabel("Giá bán dự kiến (VNĐ) *").fill("120000");
  await page.getByLabel("Khối lượng (gram) *").fill("500");
  await page.getByLabel("Mô tả tình trạng và khuyết điểm *").fill("Xước nhẹ ở khóa kéo");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã lưu bản nháp.");

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

  expect(updateBody).toEqual({
    title: "Draft E2E đã sửa",
    description: "",
    categoryId: "fashion",
    conditionGrade: "NEW_SEALED",
    conditionNotes: "Xước nhẹ ở khóa kéo",
    price: 135_000,
    weightGram: 500
  });

  await page.reload();
  await expect(page.getByRole("row", { name: /Draft E2E đã sửa/ })).toContainText("135.000đ");
});
