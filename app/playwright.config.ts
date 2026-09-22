import { defineConfig } from "@playwright/test";

// Design-system e2e specs (app/e2e/design-system/) run against a separate
// config (playwright.design-system.config.ts) instead of a second project
// here — Playwright boots every entry in `webServer` regardless of which
// `--project` is selected, so folding both servers into one config meant
// every design-system-only run still paid for a full production build.
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /e2e\/design-system\/.*\.spec\.ts/,
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
