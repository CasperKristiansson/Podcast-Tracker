import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "packages/lambdas/spotifyProxy/src/**/*.ts",
        "packages/lambdas/refreshSubscriptions/src/**/*.ts",
      ],
      exclude: [
        "packages/lambdas/spotifyProxy/src/**/*.test.ts",
        "packages/lambdas/spotifyProxy/src/**/*.d.ts",
        "packages/lambdas/refreshSubscriptions/src/**/*.test.ts",
        "packages/lambdas/refreshSubscriptions/src/**/*.d.ts",
      ],
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
