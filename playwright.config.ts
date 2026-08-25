import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "corepack pnpm --filter @rebox/api start",
      url: "http://127.0.0.1:3001/health/ready",
      reuseExistingServer: true
    },
    {
      command: "corepack pnpm --filter @rebox/web start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true
    }
  ]
});
