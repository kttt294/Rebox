import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseJwtGuard } from "../src/http/guards/supabase-jwt.guard";

const issuer = "http://rebox.test/auth/v1";
let server: Server;
let privateKey: KeyLike;
let jwksUrl: string;

beforeAll(async () => {
  const keys = await generateKeyPair("ES256");
  privateKey = keys.privateKey;
  const publicJwk = await exportJWK(keys.publicKey);
  Object.assign(publicJwk, { kid: "test-key", alg: "ES256", use: "sig" });
  server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ keys: [publicJwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  jwksUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/jwks.json`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

describe("SupabaseJwtGuard", () => {
  it("maps only a verified subject to the actor", async () => {
    const request = { headers: { authorization: `Bearer ${await token("authenticated")}` } };
    const guard = createGuard(false);
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toMatchObject({ actor: { id: "10000000-0000-4000-8000-000000000010" } });
  });

  it("rejects a token for the wrong audience", async () => {
    const guard = createGuard(false);
    const request = { headers: { authorization: `Bearer ${await token("another-audience")}` } };
    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({ status: 401 });
  });

  it("allows an explicitly public route without a token", async () => {
    await expect(createGuard(true).canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
  });
});

function createGuard(isPublic: boolean): SupabaseJwtGuard {
  process.env.SUPABASE_ISSUER = issuer;
  process.env.SUPABASE_AUDIENCE = "authenticated";
  process.env.SUPABASE_JWKS_URL = jwksUrl;
  return new SupabaseJwtGuard({ getAllAndOverride: () => isPublic } as never);
}

async function token(audience: string): Promise<string> {
  return new SignJWT({ role: "SUPER_ADMIN" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("10000000-0000-4000-8000-000000000010")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

function contextFor(request: object) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request })
  } as never;
}
