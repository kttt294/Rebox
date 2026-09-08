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
  await page.getByRole("textbox", { name: "Email" }).fill("new-seller@reboxe.test");
  await page.getByPlaceholder("Mật khẩu (ít nhất 8 ký tự)").fill("secure-password");
  await page.getByPlaceholder("Nhập lại mật khẩu").fill("secure-password");

  const requestPromise = page.waitForRequest("**/auth/v1/signup**");
  await page.getByRole("button", { name: "ĐĂNG KÝ" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({
    email: "new-seller@reboxe.test",
    password: "secure-password"
  });
  await expect(page.locator("p[role='alert']")).toHaveText("Không thể tạo tài khoản. Email có thể đã được sử dụng.");
});

test("verifies a new account with the emailed OTP", async ({ page }) => {
  await page.route("**/auth/v1/signup**", (route) => route.fulfill({
    body: JSON.stringify({ id: "10000000-0000-4000-8000-000000000004", email: "buyer@reboxe.test" }),
    contentType: "application/json",
    status: 200
  }));
  await page.route("**/auth/v1/verify**", (route) => route.fulfill({
    body: JSON.stringify({ code: "otp_expired", msg: "Token has expired or is invalid" }),
    contentType: "application/json",
    status: 403
  }));

  await page.goto("/register");
  await page.getByRole("textbox", { name: "Email" }).fill("buyer@reboxe.test");
  await page.getByPlaceholder("Mật khẩu (ít nhất 8 ký tự)").fill("secure-password");
  await page.getByPlaceholder("Nhập lại mật khẩu").fill("secure-password");
  await page.getByRole("button", { name: "ĐĂNG KÝ" }).click();

  await expect(page.getByText("Nhập mã 6 số đã gửi tới buyer@reboxe.test.")).toBeVisible();
  await page.getByRole("textbox", { name: "Mã xác thực" }).fill("123456");
  const requestPromise = page.waitForRequest("**/auth/v1/verify**");
  await page.getByRole("button", { name: "XÁC THỰC" }).click();
  expect((await requestPromise).postDataJSON()).toMatchObject({
    email: "buyer@reboxe.test",
    token: "123456",
    type: "signup"
  });
  await expect(page.locator("p[role='alert']")).toHaveText("Mã xác thực không đúng hoặc đã hết hạn.");
});
