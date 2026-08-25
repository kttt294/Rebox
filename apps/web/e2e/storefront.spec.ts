import { expect, test } from "@playwright/test";

test("renders only an active listing through the public NestJS endpoint", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTPUBLICLISTING00000");
  await expect(page.getByRole("heading", { name: "Áo khoác hoàn đơn synthetic" })).toBeVisible();
  await expect(page.getByText("REBOX Verified Fixture")).toBeVisible();
  await expect(page.getByText("120.000đ")).toBeVisible();
  await expect(page.getByText("Xước nhẹ ở khóa kéo")).toBeVisible();
});

test("does not expose a draft listing", async ({ page }) => {
  await page.goto("/listings/RBX-01JTESTDRAFTLISTING000000");
  await expect(page.getByRole("heading", { name: "Không tìm thấy listing" })).toBeVisible();
});
