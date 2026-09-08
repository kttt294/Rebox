import { expect, test } from "@playwright/test";

test("shows the account full name in the home header", async ({ page }) => {
  const user = {
    id: "e82857be-61e7-46fc-b6cb-0bd8ecab5198",
    aud: "authenticated",
    role: "authenticated",
    email: "zeycallisto@gmail.com",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Zey Callisto" },
    identities: [],
    created_at: "2026-09-04T00:00:00.000Z",
    updated_at: "2026-09-08T00:00:00.000Z"
  };
  const now = Math.floor(Date.now() / 1000);
  const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", iat: now, exp: now + 3600 })).toString("base64url")}.signature`;

  await page.route("**/auth/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/token")) return route.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh", user } });
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    return route.fulfill({ status: 404, json: {} });
  });

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secure-password");
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Zey Callisto", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "zeycallisto", exact: true })).toHaveCount(0);
});
