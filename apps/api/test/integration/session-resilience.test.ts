import { describe, expect, it } from "vitest";
import { SessionStreamService } from "../../src/platform/streaming/session-stream.service.js";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("session resilience", () => {
  it("marks a run interrupted when the connector disappears and preserves partial evidence", async () => {
    const fixture = await createReadyAgentFixture();
    const session = await fixture.sessions.startSession(fixture.workspaceId, fixture.actorId, {
      agentId: fixture.publishedAgent.id,
      input: "Create a report",
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "partial-1",
      type: "tool.call.started",
      payload: { toolName: "mcp", token: "sk-secret-12345678" },
    });
    const stream = new SessionStreamService(fixture.events);
    expect(JSON.stringify(stream.replay(session.id))).not.toContain("sk-secret-12345678");
    fixture.sessions.transition(
      fixture.workspaceId,
      fixture.actorId,
      session.id,
      "interrupted",
      "Connector lost.",
    );

    expect(fixture.sessions.getSession(fixture.workspaceId, session.id).status).toBe("interrupted");
    expect(fixture.events.listNormalized(session.id)).toHaveLength(1);
    expect(JSON.stringify(fixture.events.listNormalized(session.id))).not.toContain(
      "sk-secret-12345678",
    );
  });

  it("replays after an SSE disconnect without duplicating records", async () => {
    const fixture = await createReadyAgentFixture();
    const session = await fixture.sessions.startSession(fixture.workspaceId, fixture.actorId, {
      agentId: fixture.publishedAgent.id,
      input: "Stream progress",
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "one",
      type: "session.output.delta",
      payload: { text: "one" },
    });
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "two",
      type: "session.output.delta",
      payload: { text: "two" },
    });
    const stream = new SessionStreamService(fixture.events);

    expect(stream.replay(session.id, 1).map((event) => event.id)).toEqual([2]);
    fixture.events.ingestRawEvent(session.id, {
      sourceEventId: "two",
      type: "session.output.delta",
      payload: { text: "duplicate" },
    });
    expect(fixture.events.listNormalized(session.id)).toHaveLength(2);
  });
});
