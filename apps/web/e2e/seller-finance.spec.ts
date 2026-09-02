import { expect, test } from "@playwright/test";

test("does not render synthetic finance balances", async ({ page }) => {
  await page.goto("/seller/finance");

  await expect(page.getByRole("heading", { name: "Chưa có dữ liệu tài chính" })).toBeVisible();
  await expect(page.getByText("1.150.000 VNĐ")).toHaveCount(0);
  await expect(page.getByText("850.000 VNĐ")).toHaveCount(0);
});

test("shows the unavailable state on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seller/finance");

  await expect(page.getByRole("heading", { name: "Chưa có dữ liệu tài chính" })).toBeVisible();
});
