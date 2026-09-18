import { describe, expect, it } from "vitest";
import { TraceService } from "../../src/modules/observability-governance/trace.service.js";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("session investigation", () => {
  it("reconstructs ordered evidence, links artifacts, and retains redacted interruption evidence", async () => {
    const fixture = await createReadyAgentFixture();
    const session = await fixture.sessions.startSession(fixture.workspaceId, fixture.actorId, {
      agentId: fixture.publishedAgent.id,
      input: "Investigate run",
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "1",
      type: "session.output.delta",
      payload: { text: "Started sk-secret-12345678" },
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "2",
      type: "tool.call.started",
      payload: { toolName: "mcp", token: "sk-secret-12345678" },
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "3",
      type: "artifact.reported",
      payload: { name: "report.md" },
    });
    fixture.artifacts.recordArtifactReport(session, {
      sourceEventId: "3",
      name: "report.md",
      workspaceRelativePath: "artifacts/report.md",
    });
    fixture.sessions.transition(
      fixture.workspaceId,
      fixture.actorId,
      session.id,
      "interrupted",
      "Executor disconnected",
    );
    const trace = new TraceService(
      fixture.sessions,
      fixture.events,
      fixture.artifacts,
      fixture.audit,
    );
    const evidence = await trace.getInvestigation(fixture.workspaceId, session.id);

    expect(evidence.trace.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(evidence.trace[1]?.category).toBe("tool");
    expect(evidence.artifacts).toHaveLength(1);
    expect(evidence.session.status).toBe("interrupted");
    expect(JSON.stringify(evidence)).not.toContain("sk-secret-12345678");
  });
});
