import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { createDatabase, KycModule, type CatalogMediaStorage } from "@rebox/backend";
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from "jose";
import { afterAll, beforeAll, expect, it } from "vitest";
import { KYC } from "../src/backend.providers";
import { AdminKycController } from "../src/http/controllers/admin-kyc.controller";
import { KycReviewerGuard } from "../src/http/guards/kyc-reviewer.guard";
import { SupabaseJwtGuard } from "../src/http/guards/supabase-jwt.guard";
import { HttpExceptionFilter } from "../src/http/filters/http-exception.filter";

const database = createDatabase(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const moderator = randomUUID();
const seller = randomUUID();
const inactive = randomUUID();
const superAdmin = randomUUID();
const issuer = "http://kyc-http.test/auth/v1";
let app: INestApplication;
let server: Server;
let privateKey: KeyLike;
let baseUrl: string;
const storage: CatalogMediaStorage = {
  createUploadIntent: async () => { throw new Error("Unused"); }, inspectObject: async () => null,
  readObject: async () => { throw new Error("Unused"); }, deleteObject: async () => {}, publicUrl: () => { throw new Error("Unused"); }
};

beforeAll(async () => {
  for (const id of [moderator, seller, inactive, superAdmin]) {
    await database.pool.query("INSERT INTO auth.users (id) VALUES ($1)", [id]);
    await database.pool.query("INSERT INTO profiles (id) VALUES ($1) ON CONFLICT DO NOTHING", [id]);
  }
  for (const [id, role, status] of [[moderator, "MODERATOR", "ACTIVE"], [inactive, "MODERATOR", "INACTIVE"], [superAdmin, "SUPER_ADMIN", "ACTIVE"]]) {
    await database.pool.query("INSERT INTO platform_staff_roles (user_id, role, status) VALUES ($1, $2, $3)", [id, role, status]);
  }
  const keys = await generateKeyPair("ES256"); privateKey = keys.privateKey;
  const jwk = { ...await exportJWK(keys.publicKey), kid: "kyc-test", alg: "ES256", use: "sig" };
  server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.SUPABASE_ISSUER = issuer;
  process.env.SUPABASE_JWKS_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const kyc = new KycModule(database.pool, "synthetic-http-test-secret-at-least-32", storage, {
    name: "SYNTHETIC", analyzeDocument: async () => ({ identity: {}, documentValid: true }),
    compareFace: async () => ({ matched: true, score: 1 }), checkLiveness: async () => ({ passed: true, score: 1 })
  }, { verifyBank: async () => ({ status: "UNAVAILABLE" }), verifyTax: async () => ({ status: "UNAVAILABLE" }) });
  const module = await Test.createTestingModule({
    controllers: [AdminKycController], providers: [
      { provide: KYC, useValue: kyc }, KycReviewerGuard, { provide: APP_GUARD, useClass: SupabaseJwtGuard }
    ]
  }).compile();
  app = module.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1"); baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  await database.pool.query("DELETE FROM platform_staff_roles WHERE user_id = ANY($1)", [[moderator, inactive, superAdmin]]);
  await database.pool.query("DELETE FROM profiles WHERE id = ANY($1)", [[moderator, inactive, superAdmin, seller]]);
  await database.pool.query("DELETE FROM auth.users WHERE id = ANY($1)", [[moderator, inactive, superAdmin, seller]]);
  await database.pool.end();
});

async function token(id: string, aal = "aal2") {
  return new SignJWT({ aal, role: "SUPER_ADMIN" }).setSubject(id).setIssuer(issuer).setAudience("authenticated")
    .setProtectedHeader({ alg: "ES256", kid: "kyc-test" }).setIssuedAt().setExpirationTime("5m").sign(privateKey);
}
async function request(path: string, accessToken?: string, input?: unknown, key?: string) {
  return fetch(`${baseUrl}/v1/admin/kyc${path}`, {
    method: input ? "POST" : "GET", headers: {
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(input ? { "content-type": "application/json" } : {}), ...(key ? { "Idempotency-Key": key } : {})
    }, ...(input ? { body: JSON.stringify(input) } : {})
  });
}

it("protects all three HTTP endpoints with signed JWT, database role and AAL2", async () => {
  for (const accessToken of [undefined, "invalid"]) {
    expect((await request("", accessToken)).status).toBe(401);
  }
  for (const accessToken of [await token(seller), await token(inactive), await token(moderator, "aal1")]) {
    expect((await request("", accessToken)).status).toBe(403);
    expect((await request("/missing", accessToken)).status).toBe(403);
    expect((await request("/missing/decision", accessToken, { decision: "APPROVE", reason: "Reason" }, randomUUID())).status).toBe(403);
  }
  for (const id of [moderator, superAdmin]) {
    const response = await request("", await token(id));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ items: expect.any(Array) });
    expect((await request("/missing", await token(id))).status).toBe(404);
  }
});

it("rejects strict-body violations, invalid UUID keys and invalid queue queries", async () => {
  const accessToken = await token(moderator);
  const valid = { decision: "APPROVE", reason: "Reason" };
  for (const body of [{ ...valid, reviewerId: seller }, { ...valid, decision: "MAYBE" }, { ...valid, reason: "  " }]) {
    expect((await request("/missing/decision", accessToken, body, randomUUID())).status).toBe(422);
  }
  for (const key of [undefined, "not-a-uuid"]) {
    expect((await request("/missing/decision", accessToken, valid, key)).status).toBe(422);
  }
  expect((await request("?status=VERIFIED", accessToken)).status).toBe(422);
  expect((await request("?unexpected=field", accessToken)).status).toBe(422);
  expect((await request("/missing/decision", accessToken, valid, randomUUID())).status).toBe(404);
});
