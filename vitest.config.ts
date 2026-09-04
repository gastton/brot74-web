import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
    // e2e/ son specs de Playwright (BRT-122), no de Vitest — sin este exclude,
    // el glob default de Vitest los agarra igual y choca con el test() global
    // de Playwright ("Playwright Test did not expect test() to be called here").
    exclude: ["**/node_modules/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
