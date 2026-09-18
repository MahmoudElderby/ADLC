import swc from "unplugin-swc";
import { defineWorkspace } from "vitest/config";
import { sharedVitestConfig } from "./config/vitest/vitest.shared.js";

export default defineWorkspace([
  {
    ...sharedVitestConfig,
    plugins: [
      swc.vite({
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
        module: { type: "es6" },
      }),
    ],
    test: {
      ...sharedVitestConfig.test,
      name: "api",
      include: ["apps/api/test/**/*.test.ts"],
      setupFiles: ["apps/api/test/setup-env.ts"],
      fileParallelism: false,
      pool: "forks",
      maxWorkers: 1,
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
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
