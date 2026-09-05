import { expect, test } from "@playwright/test";

const kycId = "RBXKYC-01JTESTMANUAL0000000000";
const shopId = "RBX-01JTESTMANUAL000000000000";
const reason = "Tên đăng ký chưa khớp với giấy tờ.";
const identity = { citizenId: "********0001", fullName: "NGUYEN VAN TEST", dateOfBirth: "01/01/2003", gender: "Nam", address: "Ha Noi", issuedAt: "01/01/2022" };
const verification = { documentValid: true, faceMatched: true, faceScore: 0.95, livenessPassed: true, livenessScore: 0.99 };
const queueItem = { kycId, shopId, shopDisplayName: "Shop kiểm thử KYC", status: "MANUAL_REVIEW", provider: "SYNTHETIC", submittedAt: "2026-09-05T00:00:00Z" };

for (const [status, message] of [
  ["PROCESSING", "Hồ sơ đang xử lý hoặc còn thiếu bước xác minh"],
  ["MANUAL_REVIEW", "Hồ sơ đang chờ nhân viên duyệt"],
  ["VERIFIED", "Bạn được phép đăng bán"],
  ["REJECTED", "Vui lòng liên hệ hỗ trợ REBOX"]
]) {
  test(`seller sees ${status} after reload without persisted KYC ID`, async ({ page }) => {
    await page.route("**/v1/me", (route) => route.fulfill({ json: {
      id: "10000000-0000-4000-8000-000000000002", profileStatus: "ACTIVE",
      shops: [{ id: shopId, displayName: queueItem.shopDisplayName, role: "OWNER", membershipStatus: "ACTIVE", kycId, kycStatus: status, status: "ONBOARDING" }]
    } }));
    await page.route(`**/v1/kyc/${kycId}/status`, (route) => route.fulfill({ json: {
      success: true, kycStatus: status, identity, verification,
      review: status === "REJECTED" ? { reason, reviewedAt: "2026-09-05T01:00:00Z" } : null
    } }));
    await page.goto("/seller/kyc");
    await expect(page.getByRole("status")).toContainText(message!);
    if (status === "REJECTED") await expect(page.getByText(reason, { exact: false })).toBeVisible();
    await expect(page.getByText("Điểm khuôn mặt")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("status")).toContainText(message!);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(kycId);
  });
}

for (const decision of ["APPROVE", "REJECT"] as const) {
  test(`admin ${decision} requires reason and prevents double submission`, async ({ page }) => {
    let decisions = 0;
    await page.route("**/v1/admin/kyc**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/decision")) {
        decisions++;
        expect(request.headers()["idempotency-key"]).toMatch(/^[a-f0-9-]{36}$/);
        expect(request.postDataJSON()).toEqual({ decision, reason });
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({ json: { kycId, kycStatus: decision === "APPROVE" ? "VERIFIED" : "REJECTED", review: { reason, reviewedAt: "2026-09-05T01:00:00Z" } } });
      } else if (path === `/v1/admin/kyc/${kycId}`) {
        await route.fulfill({ json: { ...queueItem, identity, verification, review: null,
          tax: { status: "UNAVAILABLE", registeredName: null }, bank: { bankCode: "VCB", accountNumber: "********9012", status: "UNAVAILABLE", registeredName: null, nameMatchScore: null }
        } });
      } else await route.fulfill({ json: { items: decisions ? [] : [queueItem], nextCursor: null } });
    });
    await page.goto("/admin/kyc");
    await page.getByRole("button", { name: queueItem.shopDisplayName }).click();
    await expect(page.getByText("********0001", { exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/rebox-admin-kyc-${decision}.png`, fullPage: true });
    await page.getByLabel("Quyết định", { exact: true }).selectOption(decision);
    await page.getByRole("button", { name: "Gửi quyết định" }).click();
    expect(decisions).toBe(0);
    await page.getByLabel("Lý do", { exact: false }).fill(reason);
    await page.getByRole("button", { name: "Gửi quyết định" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect(page.getByRole("status")).toContainText(decision === "APPROVE" ? "Đã phê duyệt" : "Đã từ chối");
    expect(decisions).toBe(1);
    await expect(page.getByRole("button", { name: queueItem.shopDisplayName })).toHaveCount(0);
  });
}

test("admin retry after a lost response reuses the idempotency key", async ({ page }) => {
  const keys: string[] = [];
  await page.route("**/v1/admin/kyc**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      keys.push(request.headers()["idempotency-key"]!);
      if (keys.length === 1) await route.abort();
      else await route.fulfill({ json: { kycId, kycStatus: "VERIFIED", review: { reason, reviewedAt: "2026-09-05T01:00:00Z" } } });
    } else if (new URL(request.url()).pathname.endsWith(kycId)) {
      await route.fulfill({ json: { ...queueItem, identity, verification, review: null,
        tax: { status: "UNAVAILABLE", registeredName: null }, bank: { bankCode: "VCB", accountNumber: "********9012", status: "UNAVAILABLE", registeredName: null, nameMatchScore: null }
      } });
    } else await route.fulfill({ json: { items: [queueItem], nextCursor: null } });
  });
  await page.goto("/admin/kyc");
  await page.getByRole("button", { name: queueItem.shopDisplayName }).click();
  await page.getByLabel("Quyết định", { exact: true }).selectOption("APPROVE");
  await page.getByLabel("Lý do", { exact: false }).fill(reason);
  await page.getByRole("button", { name: "Gửi quyết định" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Gửi quyết định" }).click();
  await expect(page.getByRole("status")).toContainText("Đã phê duyệt");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("unauthorized users cannot see admin records", async ({ page }) => {
  await page.route("**/v1/admin/kyc**", (route) => route.fulfill({ status: 403, json: { error: { code: "FORBIDDEN", message: "Forbidden" } } }));
  await page.goto("/admin/kyc");
  await expect(page.locator("main").getByRole("alert")).toContainText("Bạn không có quyền");
  await expect(page.getByRole("region", { name: "Hàng đợi KYC" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Chi tiết hồ sơ" })).toHaveCount(0);
});

for (const enrolled of [false, true]) {
  test(`staff completes MFA with ${enrolled ? "an existing" : "a new"} TOTP factor`, async ({ page }) => {
    let verified = false;
    const user = { id: "20000000-0000-4000-8000-000000000003", aud: "authenticated", role: "authenticated", email: "moderator@rebox.test",
      app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-09-05T00:00:00Z",
      factors: enrolled ? [{ id: "factor-test", factor_type: "totp", status: "verified", created_at: "2026-09-05T00:00:00Z", updated_at: "2026-09-05T00:00:00Z" }] : [] };
    function session() {
      const now = Math.floor(Date.now() / 1000);
      const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", aal: verified ? "aal2" : "aal1", iat: now, exp: now + 3600 })).toString("base64url")}.signature`;
      return { access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh", user };
    }
    await page.route("**/auth/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/verify")) {
        expect(route.request().postDataJSON()).toMatchObject({ code: "123456", challenge_id: "challenge-test" });
        verified = true; await route.fulfill({ json: session() });
      } else if (path.endsWith("/challenge")) await route.fulfill({ json: { id: "challenge-test", expires_at: Math.floor(Date.now() / 1000) + 300 } });
      else if (path.endsWith("/factors")) await route.fulfill({ json: { id: "factor-test", type: "totp", totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>', secret: "SYNTHETIC", uri: "otpauth://totp/test" } } });
      else if (path.endsWith("/token")) await route.fulfill({ json: session() });
      else await route.fulfill({ json: user });
    });
    await page.route("**/v1/admin/kyc**", (route) => verified
      ? route.fulfill({ json: { items: [queueItem], nextCursor: null } })
      : route.fulfill({ status: 403, json: { error: { code: "MFA_REQUIRED", message: "AAL2 required" } } }));
    await page.route("**/v1/me", (route) => route.fulfill({ json: { id: user.id, profileStatus: "ACTIVE", shops: [] } }));
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(user.email);
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Synthetic-Test-Password-123!");
    await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
    await page.waitForURL((url) => url.pathname !== "/login");
    await page.goto("/admin/kyc");
    await page.getByRole("button", { name: "Xác thực hai bước", exact: true }).click();
    if (!enrolled) await expect(page.getByRole("img", { name: "Mã QR thiết lập xác thực hai bước" })).toBeVisible();
    await page.getByLabel("Mã xác thực", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.getByRole("button", { name: queueItem.shopDisplayName })).toBeVisible();
    expect(verified).toBe(true);
  });
}
