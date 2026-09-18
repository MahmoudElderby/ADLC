import { expect, test } from "./fixtures.js";

test("navigates from Command Center to session investigation and history", async ({ page }) => {
  const sessionId = "00000000-0000-4000-8000-000000000101";
  const agentId = "00000000-0000-4000-8000-000000000102";
  const actorId = "00000000-0000-4000-8000-000000000103";
  const timestamp = "2026-09-18T12:00:00.000Z";
  await page.route("**/api/v1/dashboard/live-fleet", async (route) =>
    route.fulfill({
      json: [
        {
          sessionId,
          agentId,
          agentName: "API release planner",
          status: "running",
          skillCount: 2,
          mcpCount: 1,
          lastSummary: "Writing report",
          lastEventAt: timestamp,
          links: { session: `/sessions/${sessionId}`, agent: `/agents/${agentId}` },
        },
      ],
    }),
  );
  await page.route("**/api/v1/sessions/history", async (route) =>
    route.fulfill({
      json: [
        {
          sessionId,
          agentId,
          agentName: "API release planner",
          status: "completed",
          createdAt: timestamp,
          terminalAt: timestamp,
          failureSummary: null,
          links: { session: `/sessions/${sessionId}`, agent: `/agents/${agentId}` },
        },
      ],
    }),
  );
  await page.route(`**/api/v1/sessions/${sessionId}/investigation`, async (route) =>
    route.fulfill({
      json: {
        session: { id: sessionId, status: "completed" },
        trace: [
          {
            id: "00000000-0000-4000-8000-000000000104",
            sessionId,
            sequence: 1,
            category: "lifecycle",
            type: "session.state_changed",
            actorType: "system",
            actorId: null,
            summary: "Session is running.",
            metadata: {},
            occurredAt: timestamp,
          },
          {
            id: "00000000-0000-4000-8000-000000000105",
            sessionId,
            sequence: 2,
            category: "tool",
            type: "tool.call.started",
            actorType: "mcp",
            actorId: null,
            summary: "Tool activity: create_work_item.",
            metadata: {},
            occurredAt: timestamp,
          },
        ],
        artifacts: [
          {
            id: "00000000-0000-4000-8000-000000000106",
            sessionId,
            reportSequence: 1,
            name: "report.md",
            type: "markdown",
            workspaceRelativePath: "artifacts/report.md",
            status: "valid",
            reportedAt: timestamp,
            validatedAt: timestamp,
          },
        ],
        snapshot: { schemaVersion: 1, approvalMode: "always_allow", secret: "[REDACTED]" },
        audits: [
          {
            id: "00000000-0000-4000-8000-000000000107",
            actorId,
            action: "session.started",
            entityType: "session",
            entityId: sessionId,
            outcome: "succeeded",
            metadata: {},
            createdAt: timestamp,
          },
        ],
      },
    }),
  );
  await page.goto("/command-center");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByText("API release planner")).toBeVisible();
  await expect(page.getByText("completed")).not.toBeVisible();
  await page.getByRole("link", { name: "Open session" }).click();
  await expect(page.getByRole("heading", { name: "Session Investigation" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Trace" })).toBeVisible();
  await expect(page.getByText("Tool activity: create_work_item.")).toBeVisible();
  await page.getByRole("tab", { name: "Snapshot" }).click();
  await expect(page.getByText('"schemaVersion": 1')).toBeVisible();
  await page.getByRole("tab", { name: "Artifacts" }).click();
  await expect(page.getByText("artifacts/report.md")).toBeVisible();
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByText("session.started")).toBeVisible();
  await page.getByRole("link", { name: "Session history" }).click();
  await expect(page.getByRole("heading", { name: "Session History" })).toBeVisible();
  await expect(page.getByText("completed")).toBeVisible();
});
