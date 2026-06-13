import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for the demo-fixture regression tests.
 *
 * environment: 'node' — fixtures are plain TS objects validated via Zod.
 * No React, no DOM, no Next runtime needed.
 *
 * The @/ path alias mirrors tsconfig.json so test imports look the same
 * as production code.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
