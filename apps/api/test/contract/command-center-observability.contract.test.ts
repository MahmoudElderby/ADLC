import { describe, expect, it } from "vitest";
import {
  artifactSchema,
  auditResponseSchema,
  liveFleetItemSchema,
  liveFleetResponseSchema,
  sessionHistoryItemSchema,
  sessionHistoryResponseSchema,
  sessionInvestigationSchema,
  traceResponseSchema,
} from "@adlc/contracts";

const id = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-18T12:00:00.000Z";

describe("Command Center and observability contracts", () => {
  it("accepts stable live-fleet navigation identifiers and capability indicators", () => {
    expect(
      liveFleetItemSchema.parse({
        sessionId: id,
        agentId: id,
        agentName: "Release planner",
        status: "running",
        skillCount: 1,
        mcpCount: 1,
        lastSummary: "Writing report",
        lastEventAt: timestamp,
        links: { session: `/sessions/${id}`, agent: `/agents/${id}` },
      }),
    ).toMatchObject({ sessionId: id, links: { session: `/sessions/${id}` } });
  });

  it("validates history, investigation evidence, and never requires secret values", () => {
    const historyPayload = [
      {
        sessionId: id,
        agentId: id,
        agentName: "Release planner",
        status: "interrupted",
        createdAt: timestamp,
        terminalAt: timestamp,
        failureSummary: "Executor disconnected",
        links: { session: `/sessions/${id}`, agent: `/agents/${id}` },
      },
    ];
    const history = sessionHistoryItemSchema.parse(historyPayload[0]);
    expect(sessionHistoryResponseSchema.parse(historyPayload)).toHaveLength(1);
    expect(
      liveFleetResponseSchema.parse([
        {
          sessionId: id,
          agentId: id,
          agentName: "Release planner",
          status: "running",
          skillCount: 1,
          mcpCount: 1,
          lastSummary: null,
          lastEventAt: timestamp,
          links: { session: `/sessions/${id}`, agent: `/agents/${id}` },
        },
      ]),
    ).toHaveLength(1);
    const artifact = artifactSchema.parse({
      id,
      sessionId: id,
      reportSequence: 1,
      name: "report.md",
      type: "markdown",
      workspaceRelativePath: "artifacts/report.md",
      status: "valid",
      reportedAt: timestamp,
      validatedAt: timestamp,
    });
    const trace = traceResponseSchema.parse([
      {
        id,
        sessionId: id,
        sequence: 1,
        category: "output",
        type: "session.output.delta",
        actorType: "agent",
        actorId: id,
        summary: "Redacted output",
        metadata: { token: "[REDACTED]" },
        occurredAt: timestamp,
      },
    ]);
    const audits = auditResponseSchema.parse([
      {
        id,
        actorId: id,
        action: "session.started",
        entityType: "session",
        entityId: id,
        outcome: "succeeded",
        metadata: { token: "[REDACTED]" },
        createdAt: timestamp,
      },
    ]);
    const investigation = sessionInvestigationSchema.parse({
      session: { id, status: "interrupted" },
      trace,
      artifacts: [artifact],
      snapshot: { schemaVersion: 1 },
      audits,
    });

    expect(history.status).toBe("interrupted");
    expect(JSON.stringify(investigation)).not.toContain("sk-secret-12345678");
    expect(investigation.artifacts[0]?.workspaceRelativePath).toBe("artifacts/report.md");
    expect(investigation.trace[0]?.sequence).toBe(1);
    expect(investigation.audits[0]?.entityId).toBe(id);
  });
});
