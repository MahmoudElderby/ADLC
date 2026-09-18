import { defineConfig, devices } from "@playwright/test";

const spec001Intercepting = [
  "**/prepare-runnable-agent.spec.ts",
  "**/run-agent-and-track-artifact.spec.ts",
  "**/secret-redaction.spec.ts",
  "**/monitor-and-investigate-session.spec.ts",
  "**/accessibility.spec.ts",
];

const webOrigin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

const cockpitEnv = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "test-openai-key",
  SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY ?? "ci-secret-encryption-key-32-bytes",
  ADLC_OPERATOR_EMAIL: process.env.ADLC_OPERATOR_EMAIL ?? "operator@adlc.local",
  ADLC_OPERATOR_PASSWORD: process.env.ADLC_OPERATOR_PASSWORD ?? "ChangeMeOperatorPass1",
  ADLC_OPERATOR_DISPLAY_NAME: process.env.ADLC_OPERATOR_DISPLAY_NAME ?? "Operator",
  ADLC_WORKSPACE_NAME: process.env.ADLC_WORKSPACE_NAME ?? "ADLC workspace",
  ADLC_CONNECTOR_REGISTRATION_TOKEN:
    process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "replace-with-registration-secret-min-24",
  ADLC_CONNECTOR_TOKEN:
    process.env.ADLC_CONNECTOR_TOKEN ?? "replace-with-one-time-connector-token-min-24",
  ADLC_SESSION_IDLE_SECONDS: process.env.ADLC_SESSION_IDLE_SECONDS ?? "28800",
  ADLC_SESSION_ABSOLUTE_SECONDS: process.env.ADLC_SESSION_ABSOLUTE_SECONDS ?? "86400",
  ADLC_API_URL: process.env.ADLC_API_URL ?? "http://127.0.0.1:3000/api/v1",
  ADLC_WORKSPACE_PATH: process.env.ADLC_WORKSPACE_PATH ?? "C:/tmp/adlc-workspace",
  OPENAI_EXECUTOR_API_KEY: process.env.OPENAI_EXECUTOR_API_KEY ?? "test-executor-key",
  WEB_ORIGIN: webOrigin,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: webOrigin,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [...spec001Intercepting, "**/cockpit-capabilities.spec.ts", "**/*.setup.ts"],
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: [...spec001Intercepting, "**/cockpit-capabilities.spec.ts", "**/*.setup.ts"],
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
      testIgnore: [...spec001Intercepting, "**/cockpit-capabilities.spec.ts", "**/*.setup.ts"],
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testIgnore: [...spec001Intercepting, "**/cockpit-capabilities.spec.ts", "**/*.setup.ts"],
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
      testIgnore: [...spec001Intercepting, "**/cockpit-capabilities.spec.ts", "**/*.setup.ts"],
    },
    {
      name: "no-api-intercepts",
      testMatch: "**/no-api-intercepts.setup.ts",
    },
    {
      name: "cockpit-002",
      dependencies: ["no-api-intercepts"],
      testMatch: "**/cockpit-capabilities.spec.ts",
      fullyParallel: false,
      workers: 1,
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "pnpm exec tsx packages/test-support/src/test-mcp-server.ts --mode=tools --port=18080 --host=127.0.0.1 --tools=search",
      port: 18080,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
    {
      command:
        "pnpm exec tsx packages/test-support/src/test-mcp-server.ts --mode=tools --port=18081 --host=127.0.0.1 --tools=search",
      port: 18081,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
    {
      command:
        "pnpm exec tsx packages/test-support/src/test-mcp-server.ts --mode=none --port=18082 --host=127.0.0.1",
      port: 18082,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
    {
      command: "pnpm --filter @adlc/api dev",
      port: Number(process.env.API_PORT ?? 3000),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
    {
      command: "pnpm --filter @adlc/web dev",
      url: webOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
    {
      command: "pnpm --filter @adlc/workspace-connector dev",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, ...cockpitEnv },
    },
  ],
});
