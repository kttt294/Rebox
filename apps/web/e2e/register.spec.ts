import { expect, test } from "@playwright/test";

test("submits a new email/password account to Supabase", async ({ page }) => {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "user_already_exists", msg: "User already registered" }),
      contentType: "application/json",
      status: 422
    });
  });

  await page.goto("/register");
  await page.getByRole("textbox", { name: "Email" }).fill("new-seller@rebox.test");
  await page.getByPlaceholder("Mật khẩu (ít nhất 8 ký tự)").fill("secure-password");
  await page.getByPlaceholder("Nhập lại mật khẩu").fill("secure-password");

  const requestPromise = page.waitForRequest("**/auth/v1/signup**");
  await page.getByRole("button", { name: "ĐĂNG KÝ" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({
    email: "new-seller@rebox.test",
    password: "secure-password"
  });
  await expect(page.locator("p[role='alert']")).toHaveText("Không thể tạo tài khoản. Email có thể đã được sử dụng.");
});
