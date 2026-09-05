import { expect, test } from "@playwright/test";

const user = {
  id: "20000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "buyer@rebox.test",
  email_confirmed_at: "2026-09-05T00:00:00.000Z",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z"
};

test("keeps a new account as buyer and creates a seller shop after five onboarding steps", async ({ page }) => {
  let shopCreated = false;
  let createShopBody: Record<string, unknown> | undefined;
  const uploadedKinds: string[] = [];
  const kycCalls: string[] = [];
  const now = Math.floor(Date.now() / 1000);
  const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", iat: now, exp: now + 3600 })).toString("base64url")}.signature`;

  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/token")) {
      await route.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh-token", user } });
      return;
    }
    if (url.pathname.endsWith("/user")) {
      await route.fulfill({ json: user });
      return;
    }
    await route.fulfill({ status: 404, json: {} });
  });

  await page.route("http://127.0.0.1:3001/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/v1/me") {
      await route.fulfill({ json: {
        id: user.id,
        profileStatus: "ACTIVE",
        shops: shopCreated ? [{
          id: "RBX-ONBOARDING-E2E",
          displayName: "Shop Buyer E2E",
          role: "OWNER",
          membershipStatus: "ACTIVE",
          kycStatus: "PENDING",
          status: "ONBOARDING"
        }] : []
      } });
      return;
    }
    if (path === "/v1/seller-onboarding/uploads" && request.method() === "POST") {
      const { kind } = request.postDataJSON() as { kind: string };
      uploadedKinds.push(kind);
      await route.fulfill({ status: 201, json: {
        key: `seller-onboarding/${user.id}/${kind === "AVATAR" ? "avatar" : kind === "SELFIE" ? "selfie" : "cccd"}/${kind}.png`,
        uploadUrl: `http://127.0.0.1:3001/seller-upload/${kind}`,
        expiresAt: "2026-09-05T12:00:00.000Z",
        headers: { "content-type": "image/png" }
      } });
      return;
    }
    if (path === "/v1/shops" && request.method() === "POST") {
      createShopBody = request.postDataJSON() as Record<string, unknown>;
      shopCreated = true;
      await route.fulfill({ status: 201, json: { shopId: "RBX-ONBOARDING-E2E" } });
      return;
    }
    if (path === "/v1/kyc/start" && request.method() === "POST") {
      kycCalls.push(path);
      await route.fulfill({ status: 201, json: kycResult("PROCESSING", { id: "RBXKYC-E2E" }) });
      return;
    }
    if (path.startsWith("/v1/kyc/") && request.method() === "POST") {
      kycCalls.push(path);
      await route.fulfill({ status: 201, json: kycResult(path === "/v1/kyc/bank" ? "VERIFIED" : "PROCESSING") });
      return;
    }
    if (path === "/v1/categories") {
      await route.fulfill({ json: [] });
      return;
    }
    if (path.endsWith("/listings")) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ status: 404, json: {} });
  });
  await page.route("http://127.0.0.1:3001/seller-upload/**", (route) => route.fulfill({ status: 200, body: "ok" }));

  await page.goto("/login?next=/seller/onboarding");
  await page.getByRole("textbox", { name: "Email" }).fill("buyer@rebox.test");
  await page.getByPlaceholder("Mật khẩu").fill("secure-password");
  await page.getByRole("button", { name: "ĐĂNG NHẬP" }).click();
  await expect(page).toHaveURL(/\/seller\/onboarding$/);

  await page.getByLabel("Số điện thoại").fill("0901234567");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page.getByLabel("Tên shop").fill("Shop Buyer E2E");
  await page.getByLabel("Mô tả ngắn").fill("Shop dùng để kiểm thử onboarding seller.");
  await page.getByLabel("Chọn ảnh đại diện").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: Buffer.from("mock-avatar") });
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page.getByLabel("Tên người liên hệ").fill("Nguyen Van Test");
  await page.getByLabel("Địa chỉ chi tiết").fill("123 Duong Test");
  await page.getByLabel("Tỉnh/Thành phố").fill("Ha Noi");
  await page.getByLabel("Quận/Huyện").fill("Cau Giay");
  await page.getByLabel("Phường/Xã").fill("Dich Vong");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page.getByLabel("Mặt trước CCCD").setInputFiles({ name: "cccd-front.png", mimeType: "image/png", buffer: Buffer.from("mock-front") });
  await page.getByLabel("Mặt sau CCCD").setInputFiles({ name: "cccd-back.png", mimeType: "image/png", buffer: Buffer.from("mock-back") });
  await page.getByLabel("Ảnh selfie trực diện").setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: Buffer.from("mock-selfie") });
  await page.getByLabel("Mã số thuế cá nhân").fill("0123456789");
  await page.getByLabel("Ngân hàng").fill("VCB");
  await page.getByLabel("Số tài khoản").fill("0123456789");
  await page.getByLabel("Tên chủ tài khoản").fill("NGUYEN VAN TEST");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  await expect(page).toHaveURL(/\/seller\/inventory$/);
  expect(createShopBody).toMatchObject({
    displayName: "Shop Buyer E2E",
    phone: "0901234567",
    kyc: {
      taxCode: "0123456789",
      bankCode: "VCB",
      bankAccount: "0123456789",
      accountHolder: "NGUYEN VAN TEST"
    },
    documents: {
      avatarKey: `seller-onboarding/${user.id}/avatar/AVATAR.png`,
      cccdFrontKey: `seller-onboarding/${user.id}/cccd/CCCD_FRONT.png`,
      cccdBackKey: `seller-onboarding/${user.id}/cccd/CCCD_BACK.png`
    },
    carrierCodes: ["GHN", "GHTK"]
  });
  expect(uploadedKinds.sort()).toEqual(["AVATAR", "CCCD_BACK", "CCCD_FRONT", "SELFIE"]);
  expect(kycCalls).toEqual([
    "/v1/kyc/start",
    "/v1/kyc/document/front",
    "/v1/kyc/document/back",
    "/v1/kyc/selfie",
    "/v1/kyc/tax",
    "/v1/kyc/bank"
  ]);
});

function kycResult(kycStatus: string, extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    success: true,
    kycStatus,
    identity: {
      citizenId: "001203000001",
      fullName: "NGUYEN VAN TEST",
      dateOfBirth: "01/01/2003",
      gender: "Nam",
      address: "Ha Noi",
      issuedAt: "01/01/2022"
    },
    verification: {
      documentValid: true,
      faceMatched: true,
      faceScore: 0.94,
      livenessPassed: true,
      livenessScore: 0.98
    }
  };
}
