import { defineConfig, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";

function localSupabaseEnvironment(): Record<string, string> {
  const output = execFileSync("corepack", ["pnpm", "supabase", "status", "-o", "env"], {
    encoding: "utf8"
  });
  const values = Object.fromEntries(
    [...output.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]])
  );
  const required = ["API_URL", "DB_URL", "PUBLISHABLE_KEY", "SECRET_KEY"] as const;
  for (const key of required) {
    if (!values[key]) throw new Error(`Supabase local is missing ${key}; run corepack pnpm db:start`);
  }
  return {
    DATABASE_URL: values.DB_URL,
    SUPABASE_URL: values.API_URL,
    SUPABASE_ISSUER: `${values.API_URL}/auth/v1`,
    SUPABASE_AUDIENCE: "authenticated",
    SUPABASE_JWKS_URL: `${values.API_URL}/auth/v1/.well-known/jwks.json`,
    SUPABASE_SECRET_KEY: values.SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
    API_URL: "http://127.0.0.1:3001",
    NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001"
  };
}

const localEnv = process.env.REBOX_E2E_LOCAL_ENV
  ? JSON.parse(process.env.REBOX_E2E_LOCAL_ENV) as Record<string, string>
  : localSupabaseEnvironment();
process.env.REBOX_E2E_LOCAL_ENV = JSON.stringify(localEnv);
process.env.SUPABASE_URL = localEnv.SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "corepack pnpm --filter @rebox/api start",
      url: "http://127.0.0.1:3001/health/ready",
      reuseExistingServer: false,
      env: {
        ...localEnv,
        NODE_ENV: "test",
        API_PORT: "3001",
        COMMERCE_MODE: "SANDBOX",
        PAYMENT_MODE: "DISABLED",
        FULFILLMENT_MODE: "FAKE",
        EVIDENCE_MODE: "FAKE_METADATA",
        NOTIFICATION_MODE: "IN_APP_OR_LOG",
        SELLER_PII_ENCRYPTION_KEY: "test-seller-pii-encryption-key-at-least-32-characters",
        RETURN_TRACKING_ENCRYPTION_KEY: "test-encryption-secret-at-least-32-characters",
        RETURN_TRACKING_HMAC_KEY: "test-hmac-secret-at-least-32-characters"
      }
    },
    {
      command: "corepack pnpm --filter @rebox/web build && corepack pnpm --filter @rebox/web start",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      env: localEnv
    }
  ]
});
