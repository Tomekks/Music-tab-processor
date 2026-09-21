import { defineConfig } from "@playwright/test";

// Separate from playwright.config.ts deliberately (see the note there):
// /design-system (and its API route) 404 under NODE_ENV=production by
// design, so this config runs `next dev` instead of a production build —
// and stays its own config so a design-system-only run never pays for the
// main config's `npm run build`.
export default defineConfig({
  testDir: "./e2e/design-system",
  // Serial files: the specs mutate GLOBAL mutable state (active-brand.json,
  // demo-child/tokens.json, generated CSS). Parallel workers interleave one
  // file's brand flip with another file's default-brand assumptions — observed
  // passing by scheduling luck once; never again by construction. The whole
  // directory runs in ~20s, so nothing meaningful is lost.
  workers: 1,
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
