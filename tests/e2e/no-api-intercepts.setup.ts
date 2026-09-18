import { expect, test as setup } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

setup("cockpit-002 must not intercept /api/", () => {
  const specPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "cockpit-capabilities.spec.ts");
  const source = readFileSync(specPath, "utf8");
  const interceptCalls = [...source.matchAll(/\b(?:page\.route|route\.fulfill)\s*\(([^)]*)\)/g)];
  const interceptsApi = interceptCalls.some((match) => /\/api\//.test(match[1] ?? ""));
  expect(
    interceptsApi,
    "tests/e2e/cockpit-capabilities.spec.ts must not use page.route or route.fulfill of /api/",
  ).toBe(false);
});
