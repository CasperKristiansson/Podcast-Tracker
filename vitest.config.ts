import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    globals: false,
    include: ["**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "cdk.out",
      "**/dist/**",
    ],
  },
  resolve: {
    alias: [
      {
        find: "@shared",
        replacement: resolve(__dirname, "packages/shared/src"),
      },
    ],
  },
});
