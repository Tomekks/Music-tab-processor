import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // CodeScene-validated thresholds (docs/decisions/stack-and-tooling.md) --
    // a free, tool-independent substitute for the same complexity check.
    // "warn" not "error" as of 2026-09-10: HomePage (11) and getTrackMetadata
    // (18) already exceed this, built after the last CodeScene baseline --
    // see app/status/engineering-practices.md. Promote to "error" once both
    // are refactored under the ceiling.
    rules: {
      complexity: ["warn", 9],
      "max-depth": ["warn", 4],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
