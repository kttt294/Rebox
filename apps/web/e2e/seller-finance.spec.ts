import { expect, test } from "@playwright/test";

test("fits the full finance overview into a laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 755 });
  await page.goto("/seller/finance");

  const layout = await page.locator("main").evaluate((main) => {
    const total = [...main.querySelectorAll("p")].find((node) => node.textContent === "Tổng tài chính: 1.150.000 VNĐ");
    if (!total) throw new Error("Could not find the finance total");

    const mainRect = main.getBoundingClientRect();
    const totalRect = total.getBoundingClientRect();
    return {
      overflowPixels: Math.max(0, main.scrollHeight - main.clientHeight),
      totalIsVisible: totalRect.bottom <= mainRect.bottom
    };
  });

  expect(layout.overflowPixels).toBeLessThanOrEqual(1);
  expect(layout.totalIsVisible).toBe(true);
});

test("keeps vertical scrolling on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seller/finance");

  const layout = await page.evaluate(() => ({
    viewportHeight: innerHeight,
    documentHeight: document.documentElement.scrollHeight
  }));

  expect(layout.documentHeight).toBeGreaterThan(layout.viewportHeight);
});
