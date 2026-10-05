import { defineConfig } from "@playwright/test";

// Design System workbench specs (app/e2e/workbench/). Its own config, like
// playwright.design-system.config.ts, so other runs never boot these servers.
// Fixed ports: the workbench hard-codes the preview at localhost:3000 and the
// preview hard-codes the workbench at localhost:5174, so neither can move.
// The preview page 404s in production, so the app runs `next dev`.
// reuseExistingServer is false on purpose: a stale server on either port makes
// Playwright stop with "already used" instead of silently testing old code.
export default defineConfig({
  testDir: "./e2e/workbench",
  workers: 1,
  webServer: [
    {
      command: "npm run dev -- -p 3000",
      // /workbench-preview never imports the db client (unlike /), so it
      // is safe to probe without TURSO_* set.
      url: "http://localhost:3000/workbench-preview",
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm --prefix ../tools/Design_System run dev",
      url: "http://127.0.0.1:5174/foundations",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
  },
});
