import { expect, test } from "@playwright/test";

const user = {
  id: "20000000-0000-4000-8000-000000000003",
  aud: "authenticated",
  role: "authenticated",
  email: "seller@rebox.test",
  email_confirmed_at: "2026-09-05T00:00:00.000Z",
  phone: "0901234511",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z"
};

test("renders the Figma profile form with authenticated account data", async ({ page }) => {
  let profileUpdate: Record<string, unknown> | undefined;
  const now = Math.floor(Date.now() / 1000);
  const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", iat: now, exp: now + 3600 })).toString("base64url")}.signature`;

  await page.route("**/auth/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/token")) return route.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh-token", user } });
    if (path.endsWith("/user")) {
      if (route.request().method() !== "GET") profileUpdate = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ json: user });
    }
    return route.fulfill({ status: 404, json: {} });
  });

  await page.route("http://127.0.0.1:3001/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/me") return route.fulfill({ json: {
      id: user.id,
      profileStatus: "ACTIVE",
      shops: [{ id: "RBX-PROFILE", displayName: "REBOX Test Store", role: "OWNER", membershipStatus: "ACTIVE", kycId: "RBXKYC-PROFILE", kycStatus: "VERIFIED", status: "ACTIVE" }]
    } });
    if (path === "/v1/kyc/RBXKYC-PROFILE/status") return route.fulfill({ json: {
      success: true,
      kycStatus: "VERIFIED",
      review: null,
      identity: { citizenId: "********0001", fullName: "NGUYEN VAN TEST", dateOfBirth: "01/01/2000", gender: "Nam", address: "Ha Noi", issuedAt: "01/01/2022" },
      verification: { documentValid: true, faceMatched: true, faceScore: 0.99, livenessPassed: true, livenessScore: 0.99 }
    } });
    return route.fulfill({ status: 404, json: {} });
  });

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secure-password");
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
  await page.goto("/account/profile");

  await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
  await expect(page.getByLabel("Tên")).toHaveValue("NGUYEN VAN TEST");
  await expect(page.getByText("seller@rebox.test", { exact: true })).toBeVisible();
  await expect(page.getByText("********11", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nam")).toBeChecked();
  await expect(page.getByText("01/01/2000", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Chọn ảnh")).toBeAttached();

  await page.getByLabel("Tên").fill("Nguyen Van Test");
  await page.getByRole("button", { name: "LƯU" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã lưu hồ sơ.");
  expect(profileUpdate).toMatchObject({ data: { full_name: "Nguyen Van Test", gender: "Nam", date_of_birth: "01/01/2000" } });
});
