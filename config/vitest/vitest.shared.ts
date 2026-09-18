import { defineConfig } from "vitest/config";

export const sharedVitestConfig = defineConfig({
  test: {
    globals: false,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      exclude: ["**/dist/**", "**/node_modules/**", "**/*.config.*"],
    },
  },
});
