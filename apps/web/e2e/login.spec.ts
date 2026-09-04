import { expect, test } from "@playwright/test";

test("submits email/password to Supabase and shows an invalid-credentials error", async ({ page }) => {
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
      contentType: "application/json",
      status: 400
    });
  });

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("seller@rebox.test");
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill("wrong-password");

  const requestPromise = page.waitForRequest("**/auth/v1/token?grant_type=password");
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({
    email: "seller@rebox.test",
    password: "wrong-password"
  });
  await expect(page.locator("p[role='alert']")).toHaveText("Email hoặc mật khẩu không đúng.");
});
