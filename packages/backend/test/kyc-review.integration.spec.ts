import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KycModule, type BusinessVerificationProvider } from "../src/modules/kyc";
import { IdentityModule } from "../src/modules/identity";
import { createPiiKey, encryptPii } from "../src/modules/identity/pii";
import { InventoryModule, type CatalogMediaStorage } from "../src/modules/inventory";

const schema = `kyc_review_test_${randomUUID().replaceAll("-", "")}`;
const pool = new Pool({ options: `-c search_path=${schema},public`, connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const seller = randomUUID();
const moderator = { id: randomUUID(), aal: "aal2" };
const superAdmin = { id: randomUUID(), aal: "aal2" };
const inactive = { id: randomUUID(), aal: "aal2" };
const support = { id: randomUUID(), aal: "aal2" };
const secret = "synthetic-kyc-review-test-secret-at-least-32";
const encrypt = (value: string) => encryptPii(value, createPiiKey(secret));
const storage: CatalogMediaStorage = {
  createUploadIntent: async () => { throw new Error("Unused in this test"); },
  inspectObject: async (key) => ({ key, width: 100, height: 100, mimeType: "image/png", sizeBytes: 12, sha256: "a".repeat(64) }),
  readObject: async () => Buffer.from("synthetic image"),
  deleteObject: async () => {},
  publicUrl: (key) => {
    if (!key.startsWith("catalog/")) throw new Error("KYC must never request public URLs");
    return `https://storage.test/${key}`;
  }
};
const provider = {
  name: "SYNTHETIC",
  analyzeDocument: async () => ({ identity: { citizenId: "001203000001", fullName: "Nguyen Van Test" }, documentValid: true }),
  compareFace: async () => ({ matched: true, score: 0.99 }),
  checkLiveness: async () => ({ passed: true, score: 0.99 })
};
const unavailable: BusinessVerificationProvider = {
  verifyTax: async () => ({ status: "UNAVAILABLE" }),
  verifyBank: async () => ({ status: "UNAVAILABLE" })
};
const kyc = new KycModule(pool, secret, storage, provider, unavailable);
const identity = new IdentityModule(pool, secret, storage, storage);

beforeAll(async () => {
  await pool.query(`CREATE SCHEMA ${schema}`);
  for (const table of ["profiles", "shops", "shop_memberships", "listings", "categories", "restricted_categories", "outbox_events"]) {
    await pool.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  }
  await pool.query(`INSERT INTO ${schema}.categories SELECT * FROM public.categories`);
  for (const file of ["0007_seller_ekyc.sql", "0008_kyc_manual_review.sql"]) {
    const sql = await readFile(resolve(process.cwd(), "db/migrations", file), "utf8");
    await pool.query(sql.replaceAll('"public".', `"${schema}".`));
  }
  for (const actor of [seller, moderator.id, superAdmin.id, inactive.id, support.id]) {
    await pool.query("INSERT INTO profiles (id) VALUES ($1)", [actor]);
  }
  for (const [actor, role, status] of [[moderator.id, "MODERATOR", "ACTIVE"], [superAdmin.id, "SUPER_ADMIN", "ACTIVE"],
    [inactive.id, "MODERATOR", "INACTIVE"], [support.id, "SUPPORT", "ACTIVE"]]) {
    await pool.query("INSERT INTO platform_staff_roles (user_id, role, status) VALUES ($1, $2, $3)", [actor, role, status]);
  }
});
afterAll(async () => {
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);
  await pool.end();
});

async function attempt(status = "MANUAL_REVIEW") {
  const shopId = `RBX-${randomUUID()}`;
  const id = `RBXKYC-${randomUUID()}`;
  await pool.query("INSERT INTO shops (id, display_name, legal_type, kyc_status) VALUES ($1, $1, 'INDIVIDUAL', $2)", [shopId, status]);
  await pool.query("INSERT INTO shop_memberships (user_id, shop_id, role) VALUES ($1, $2, 'OWNER')", [seller, shopId]);
  await pool.query(
    `INSERT INTO seller_kyc (id, shop_id, user_id, provider, status, citizen_id_enc, full_name_enc,
      front_valid, back_valid, face_matched, liveness_passed, front_ref, back_ref, selfie_ref)
     VALUES ($1, $2, $3, 'SYNTHETIC', $4, $5, $6, true, true, true, true, 'private/front', 'private/back', 'private/selfie')`,
    [id, shopId, seller, status, encrypt("001203000001"), encrypt("Nguyen Van Test")]
  );
  await pool.query(`INSERT INTO seller_bank_accounts (kyc_id, user_id, bank_code, account_number_enc, verification_status)
    VALUES ($1, $2, 'VCB', $3, 'UNAVAILABLE')`, [id, seller, encrypt("123456789012")]);
  await pool.query(`INSERT INTO seller_tax_info (kyc_id, user_id, tax_code_enc, verification_status)
    VALUES ($1, $2, $3, 'UNAVAILABLE')`, [id, seller, encrypt("0123456789")]);
  return { id, shopId };
}

async function state(id: string) {
  const result = await pool.query(`SELECT k.status, s.kyc_status, s.status AS shop_status, k.verified_at, s.kyc_verified_at,
    b.verified AS bank_verified, t.verified AS tax_verified,
    (SELECT count(*)::int FROM seller_kyc_reviews WHERE kyc_id = k.id) AS reviews
    FROM seller_kyc k JOIN shops s ON s.id = k.shop_id
    JOIN seller_bank_accounts b ON b.kyc_id = k.id JOIN seller_tax_info t ON t.kyc_id = k.id WHERE k.id = $1`, [id]);
  return result.rows[0];
}
const approve = { decision: "APPROVE" as const, reason: " Đủ điều kiện onboarding " };

describe("Manual KYC review in PostgreSQL", () => {
  it("enforces staff role, active status and AAL2 before every read/write", async () => {
    for (const actor of [{ id: seller, aal: "aal2" }, inactive, support, { ...moderator, aal: "aal1" }, { id: moderator.id }]) {
      await expect(kyc.listReviews(actor, { status: "MANUAL_REVIEW" })).rejects.toMatchObject({ status: 403 });
      await expect(kyc.getReviewDetail(actor, "missing")).rejects.toMatchObject({ status: 403 });
      await expect(kyc.decideReview(actor, "missing", approve, randomUUID())).rejects.toMatchObject({ status: 403 });
    }
    for (const actor of [moderator, superAdmin]) await expect(kyc.requireReviewer(actor)).resolves.toBeUndefined();
    await expect(kyc.getReviewDetail(moderator, "missing")).rejects.toMatchObject({ status: 404 });
    await expect(kyc.decideReview(moderator, "missing", approve, randomUUID())).rejects.toMatchObject({ status: 404 });
  });

  it("returns only queue metadata, masked normalized detail and owner-only status", async () => {
    const { id } = await attempt();
    const queue = await kyc.listReviews(moderator, { status: "MANUAL_REVIEW" });
    expect(Object.keys(queue.items.find((item) => item.kycId === id)!).sort()).toEqual([
      "kycId", "provider", "shopDisplayName", "shopId", "status", "submittedAt"
    ]);
    const detail = await kyc.getReviewDetail(moderator, id);
    expect(detail.identity.citizenId).toBe("********0001");
    expect(detail.bank).toMatchObject({ accountNumber: "********9012", status: "UNAVAILABLE", registeredName: null });
    expect(JSON.stringify(detail)).not.toMatch(/001203000001|123456789012|0123456789|private\/|_enc|provider_reference/);
    expect((await identity.getActorContext(seller)).shops.some((shop) => shop.kycId === id)).toBe(true);
    await expect(kyc.getStatus(moderator.id, id)).rejects.toMatchObject({ status: 404 });
  });

  it("approves atomically, preserves unverified business data and replays concurrent retries", async () => {
    const { id } = await attempt();
    const key = randomUUID();
    const results = await Promise.all([kyc.decideReview(moderator, id, approve, key), kyc.decideReview(moderator, id, approve, key)]);
    expect(results[0]).toEqual(results[1]);
    const row = await state(id);
    expect(row).toMatchObject({ status: "VERIFIED", kyc_status: "VERIFIED", reviews: 1, bank_verified: false, tax_verified: false });
    expect(row.verified_at).toEqual(row.kyc_verified_at);
    expect(row.verified_at).toBeInstanceOf(Date);
    const status = await kyc.getStatus(seller, id);
    expect(status.review).toEqual(results[0]!.review);
    expect(status.review).toEqual({ reason: approve.reason.trim(), reviewedAt: expect.any(String) });
    expect(JSON.stringify(status)).not.toContain(moderator.id);
    await expect(kyc.decideReview(moderator, id, { ...approve, reason: "Changed" }, key)).rejects.toMatchObject({ status: 409 });
    const other = await attempt();
    await expect(kyc.decideReview(moderator, other.id, approve, key)).rejects.toMatchObject({ status: 409 });
    await expect(pool.query("UPDATE seller_kyc_reviews SET reason = 'overwrite' WHERE kyc_id = $1", [id])).rejects.toThrow("append-only");
    await expect(pool.query("DELETE FROM seller_kyc_reviews WHERE kyc_id = $1", [id])).rejects.toThrow("append-only");
    const review = await pool.query("SELECT reviewer_id FROM seller_kyc_reviews WHERE kyc_id = $1", [id]);
    expect(review.rows[0].reviewer_id).toBe(moderator.id);
  });

  it("activates onboarding shops on approval and allows a valid listing to publish", async () => {
    const { id, shopId } = await attempt();
    const inventory = new InventoryModule(pool, identity, storage, {
      encryptionSecret: secret, hmacSecret: secret
    });
    const draft = await inventory.createDraft(seller, shopId, {
      title: "Kiện hoàn kiểm thử", categoryId: "home", conditionGrade: "GOOD",
      conditionNotes: "Synthetic fixture in good condition", price: 120000, weightGram: 500
    });
    await inventory.completeImageUpload(seller, shopId, draft.id, `catalog/${shopId}/${draft.id}/image.png`);
    await expect(inventory.publish(seller, shopId, draft.id)).rejects.toMatchObject({ code: "SHOP_NOT_VERIFIED" });
    await kyc.decideReview(moderator, id, approve, randomUUID());
    expect(await state(id)).toMatchObject({ shop_status: "ACTIVE" });
    expect(await inventory.publish(seller, shopId, draft.id)).toMatchObject({ listing: { status: "ACTIVE" } });
  });

  it.each(["PAUSED", "SUSPENDED", "LOCKED_INSUFFICIENT_FUND"])("does not reactivate a %s shop on approval", async (status) => {
    const { id, shopId } = await attempt();
    await pool.query("UPDATE shops SET status = $2 WHERE id = $1", [shopId, status]);
    await kyc.decideReview(moderator, id, approve, randomUUID());
    expect(await state(id)).toMatchObject({ status: "VERIFIED", shop_status: status });
  });

  it("rejects with reason and forbids resetting or editing that attempt", async () => {
    const { id, shopId } = await attempt();
    await kyc.decideReview(superAdmin, id, { decision: "REJECT", reason: "Thông tin chưa khớp" }, randomUUID());
    expect(await state(id)).toMatchObject({ status: "REJECTED", kyc_status: "REJECTED", verified_at: null, kyc_verified_at: null, reviews: 1 });
    expect(await kyc.start(seller, shopId)).toMatchObject({ id, kycStatus: "REJECTED", review: { reason: "Thông tin chưa khớp" } });
    await expect(kyc.submitTax(seller, { kycId: id, taxCode: "0123456789" })).rejects.toMatchObject({ status: 409 });
  });

  it("allows only one of two conflicting reviewers to win", async () => {
    const { id } = await attempt();
    const results = await Promise.allSettled([
      kyc.decideReview(moderator, id, approve, randomUUID()),
      kyc.decideReview(superAdmin, id, { decision: "REJECT", reason: "Không khớp" }, randomUUID())
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    const row = await state(id);
    expect(row.reviews).toBe(1);
    expect(row.status).toBe(row.kyc_status);
  });

  it("rolls back review and KYC when the shop update fails", async () => {
    const { id, shopId } = await attempt();
    const constraint = `test_kyc_rollback_${randomUUID().replaceAll("-", "")}`;
    await pool.query(`ALTER TABLE shops ADD CONSTRAINT ${constraint} CHECK (id <> '${shopId}' OR kyc_status = 'MANUAL_REVIEW')`);
    try {
      await expect(kyc.decideReview(moderator, id, approve, randomUUID())).rejects.toMatchObject({ code: "23514" });
      expect(await state(id)).toMatchObject({ status: "MANUAL_REVIEW", kyc_status: "MANUAL_REVIEW", reviews: 0, verified_at: null });
    } finally { await pool.query(`ALTER TABLE shops DROP CONSTRAINT ${constraint}`); }
  });

  it("validates decision and idempotency key and excludes other statuses", async () => {
    const { id } = await attempt("PROCESSING");
    await expect(kyc.decideReview(moderator, id, approve, randomUUID())).rejects.toMatchObject({ status: 409 });
    for (const reason of ["  ", "a".repeat(1001)]) {
      await expect(kyc.decideReview(moderator, id, { ...approve, reason }, randomUUID())).rejects.toMatchObject({ status: 422 });
    }
    await expect(kyc.decideReview(moderator, id, approve, "bad-key")).rejects.toMatchObject({ status: 422 });
    await expect(kyc.listReviews(moderator, { status: "MANUAL_REVIEW", cursor: "bad-cursor" })).rejects.toMatchObject({ status: 422 });
  });

  it("walks tied timestamps with a cursor without repeating or skipping entries", async () => {
    const ids = [];
    for (let index = 0; index < 27; index++) ids.push((await attempt()).id);
    await pool.query("UPDATE seller_kyc SET created_at = '2000-01-01T00:00:00.123456Z' WHERE id = ANY($1)", [ids]);
    const first = await kyc.listReviews(moderator, { status: "MANUAL_REVIEW" });
    expect(first.items).toHaveLength(25);
    const second = await kyc.listReviews(moderator, { status: "MANUAL_REVIEW", cursor: first.nextCursor! });
    const found = [...first.items, ...second.items].map((item) => item.kycId);
    expect(new Set(found).size).toBe(found.length);
    expect(ids.every((id) => found.includes(id))).toBe(true);
  });

  it("submits all onboarding steps and reaches manual review with unavailable providers", async () => {
    const { id, shopId } = await attempt("PROCESSING");
    await pool.query("DELETE FROM seller_bank_accounts WHERE kyc_id = $1", [id]);
    await pool.query("DELETE FROM seller_tax_info WHERE kyc_id = $1", [id]);
    await pool.query(`UPDATE seller_kyc SET front_valid = NULL, back_valid = NULL, face_matched = NULL,
      liveness_passed = NULL, front_ref = NULL, back_ref = NULL, selfie_ref = NULL WHERE id = $1`, [id]);
    expect(await kyc.start(seller, shopId)).toMatchObject({ id, kycStatus: "PROCESSING" });
    for (const side of ["front", "back"] as const) {
      await kyc.submitDocument(seller, side, { kycId: id, objectKey: `seller-onboarding/${seller}/cccd/${side}.png` });
    }
    await kyc.submitSelfie(seller, { kycId: id, objectKey: `seller-onboarding/${seller}/selfie/selfie.png` });
    await kyc.submitTax(seller, { kycId: id, taxCode: "0123456789" });
    const result = await kyc.submitBank(seller, { kycId: id, bankCode: "VCB", accountNumber: "123456789012" });
    expect(result).toMatchObject({ kycStatus: "MANUAL_REVIEW", review: null, verification: { documentValid: true } });
    expect(await state(id)).toMatchObject({ status: "MANUAL_REVIEW", kyc_status: "MANUAL_REVIEW", bank_verified: false, tax_verified: false });
  });

  it("runs onboarding to manual review and discards a late provider result after approval", async () => {
    const { id } = await attempt("PROCESSING");
    let release!: () => void;
    let started!: () => void;
    const called = new Promise<void>((resolve) => { started = resolve; });
    const deferred = new Promise<void>((resolve) => { release = resolve; });
    const delayed = new KycModule(pool, secret, storage, provider, {
      ...unavailable, verifyTax: async () => { started(); await deferred; return { status: "NOT_FOUND" }; }
    });
    const pending = delayed.submitTax(seller, { kycId: id, taxCode: "0123456789" });
    await called;
    await kyc.submitBank(seller, { kycId: id, bankCode: "VCB", accountNumber: "123456789012" });
    expect(await state(id)).toMatchObject({ status: "MANUAL_REVIEW", kyc_status: "MANUAL_REVIEW" });
    await kyc.decideReview(moderator, id, approve, randomUUID());
    release();
    await expect(pending).rejects.toMatchObject({ status: 409 });
    expect(await state(id)).toMatchObject({ status: "VERIFIED", kyc_status: "VERIFIED", tax_verified: false });
  });

  it("denies direct authenticated/anonymous table access", async () => {
    for (const role of ["anon", "authenticated"]) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN"); await client.query(`SET LOCAL ROLE ${role}`);
        await expect(client.query("SELECT * FROM platform_staff_roles")).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK");
        await client.query("BEGIN"); await client.query(`SET LOCAL ROLE ${role}`);
        await expect(client.query("INSERT INTO seller_kyc_reviews (id) VALUES ('unauthorized')")).rejects.toMatchObject({ code: "42501" });
      } finally { await client.query("ROLLBACK"); client.release(); }
    }
  });
});
