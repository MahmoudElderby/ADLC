import { defineWorkspace } from "vitest/config";
import { sharedVitestConfig } from "./config/vitest/vitest.shared.js";

export default defineWorkspace([
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "api",
      include: ["apps/api/test/**/*.test.ts"],
      fileParallelism: false,
      maxWorkers: 1,
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "web",
      environment: "jsdom",
      include: ["apps/web/src/**/*.test.ts", "apps/web/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "workspace-connector",
      include: ["apps/workspace-connector/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "contracts",
      include: ["packages/contracts/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "database",
      include: ["packages/database/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "test-support",
      include: ["packages/test-support/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "ui",
      environment: "jsdom",
      include: ["packages/ui/test/**/*.test.ts"],
    },
  },
  {
    ...sharedVitestConfig,
    test: {
      ...sharedVitestConfig.test,
      name: "smoke",
      include: ["tests/smoke/**/*.test.ts"],
    },
  },
]);
