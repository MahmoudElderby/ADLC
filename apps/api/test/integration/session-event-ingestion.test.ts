import { describe, expect, it } from "vitest";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("session event ingestion", () => {
  it("deduplicates raw events and creates one normalized event per source event", async () => {
    const { sessions, events, workspaceId, actorId, publishedAgent } =
      await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Create a Markdown report.",
    });

    const first = await events.ingestRawEvent(session.id, {
      sourceEventId: "evt-1",
      type: "session.output.delta",
      payload: { text: "Working with bearer sk-secret-12345678" },
    });
    const duplicate = await events.ingestRawEvent(session.id, {
      sourceEventId: "evt-1",
      type: "session.output.delta",
      payload: { text: "Duplicate" },
    });

    expect(duplicate.raw.id).toBe(first.raw.id);
    expect(await events.listNormalized(session.id)).toHaveLength(1);
    expect((await events.listNormalized(session.id))[0]?.summary).not.toContain("sk-secret");
  });

  it("allocates monotonic sequences and keeps terminal states immutable", async () => {
    const { sessions, events, workspaceId, actorId, publishedAgent } =
      await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Create a Markdown report.",
    });

    await events.ingestRawEvent(session.id, {
      sourceEventId: "evt-running",
      type: "session.state_changed",
      payload: { current: "running" },
    });
    await events.ingestRawEvent(session.id, {
      sourceEventId: "evt-completed",
      type: "session.state_changed",
      payload: { current: "completed" },
    });
    await events.ingestRawEvent(session.id, {
      sourceEventId: "evt-failed-late",
      type: "session.state_changed",
      payload: { current: "failed" },
    });

    expect((await events.listNormalized(session.id)).map((event) => event.sequence)).toEqual([
      1, 2, 3,
    ]);
    expect((await sessions.getSession(workspaceId, session.id)).status).toBe("completed");
  });
});
