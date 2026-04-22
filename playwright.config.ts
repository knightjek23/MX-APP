import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Legible E2E tests.
 *
 * The `webServer` block auto-starts `pnpm dev` before tests run and
 * tears it down after. This is how we test the full HTTP stack
 * without needing a deployed environment.
 *
 * reuseExistingServer skips restart when running locally if the dev
 * server is already up. CI (when `process.env.CI` is set) always
 * starts a fresh server.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
