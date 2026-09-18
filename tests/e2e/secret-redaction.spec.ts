import { test, expect } from "@playwright/test";

const sessionId = "00000000-0000-4000-8000-000000000101";
const agentId = "00000000-0000-4000-8000-000000000102";
const versionId = "00000000-0000-4000-8000-000000000103";
const traceId = "00000000-0000-4000-8000-000000000104";
const artifactId = "00000000-0000-4000-8000-000000000105";
const auditId = "00000000-0000-4000-8000-000000000106";
const actorId = "00000000-0000-4000-8000-000000000107";
const timestamp = "2026-09-18T00:00:00.000Z";

test("renders every investigation evidence tab without exposing secret canaries", async ({
  page,
}) => {
  const canary = "sk-secret-12345678";
  await page.route("**/api/v1/sessions/*/investigation", async (route) => {
    await route.fulfill({
      json: {
        session: {
          id: sessionId,
          agentId,
          agentVersionId: versionId,
          status: "completed",
          executorStatus: "stopped",
          input: "Create a report",
          snapshotSummary: { schemaVersion: 1, secret: "[REDACTED]" },
          createdAt: timestamp,
          startedAt: timestamp,
          terminalAt: timestamp,
          failureSummary: null,
        },
        trace: [
          {
            id: traceId,
            sessionId,
            sequence: 1,
            category: "tool",
            type: "tool.call.started",
            actorType: "mcp",
            actorId: null,
            summary: "Tool activity: mcp.",
            metadata: { token: "[REDACTED]" },
            occurredAt: timestamp,
          },
        ],
        artifacts: [
          {
            id: artifactId,
            sessionId,
            reportSequence: 1,
            name: "report.md",
            type: "markdown",
            workspaceRelativePath: "artifacts/report.md",
            status: "valid",
            producerAgentId: agentId,
            reportedAt: timestamp,
            validatedAt: timestamp,
          },
        ],
        snapshot: { schemaVersion: 1, apiKey: "[REDACTED]", mcpToken: "[REDACTED]" },
        audits: [
          {
            id: auditId,
            actorId,
            action: "session.started",
            entityType: "session",
            entityId: sessionId,
            outcome: "succeeded",
            metadata: { authorization: "[REDACTED]" },
            createdAt: timestamp,
          },
        ],
      },
    });
  });

  await page.goto(`/sessions/${sessionId}`);
  await expect(page.getByRole("heading", { name: "Session Investigation" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Ordered trace" })).toContainText(
    "Tool activity: mcp.",
  );

  await page.getByRole("tab", { name: "Snapshot" }).click();
  await expect(page.getByRole("region", { name: "Redacted snapshot" })).toContainText("[REDACTED]");
  await page.getByRole("tab", { name: "Artifacts" }).click();
  await expect(page.getByRole("region", { name: "Artifact provenance" })).toContainText(
    "report.md",
  );
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByRole("region", { name: "Audit history" })).toContainText(
    "session.started",
  );

  expect(await page.locator("body").textContent()).not.toContain(canary);
});
