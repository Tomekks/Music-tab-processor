import { defineConfig } from "@playwright/test";

// Separate from playwright.config.ts deliberately (see the note there):
// /design-system (and its API route) 404 under NODE_ENV=production by
// design, so this config runs `next dev` instead of a production build —
// and stays its own config so a design-system-only run never pays for the
// main config's `npm run build`.
export default defineConfig({
  testDir: "./e2e/design-system",
  webServer: {
    command: "npm run dev -- -p 3002",
    url: "http://localhost:3002",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3002",
  },
});
