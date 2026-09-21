import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: [
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Dev-only routes (e.g. /design-system) 404 under NODE_ENV=production
      // by design (both the page and its API route gate on it explicitly) —
      // this second server runs `next dev` on its own port so specs can
      // reach them. Port 3002: 3000 is the prod server above, 3001 is
      // `npm run stage`'s manual-staging port (package.json).
      command: "npm run dev -- -p 3002",
      url: "http://localhost:3002",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "app",
      testMatch: /e2e\/(?!design-system\/).*\.spec\.ts/,
      use: { baseURL: "http://localhost:3000" },
    },
    {
      name: "design-system",
      testMatch: /e2e\/design-system\/.*\.spec\.ts/,
      use: { baseURL: "http://localhost:3002" },
    },
  ],
});
