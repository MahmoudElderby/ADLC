import { describe, expect, it } from "vitest";
import { firstValueFrom, take, toArray } from "rxjs";
import { createReadyAgentFixture } from "../integration/support/us2-fixtures.js";

describe("session stream contract", () => {
  it("replays from Last-Event-ID then follows live ingested events without duplicates", async () => {
    const { sessions, events, stream, workspaceId, actorId, publishedAgent } =
      await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Create a Markdown report.",
    });

    events.ingestRawEvent(session.id, {
      sourceEventId: "evt-1",
      type: "session.state_changed",
      payload: { current: "running" },
    });
    events.ingestRawEvent(session.id, {
      sourceEventId: "evt-2",
      type: "tool.call.started",
      payload: { toolName: "create_work_item", token: "secret-token" },
    });
    events.ingestRawEvent(session.id, {
      sourceEventId: "evt-3",
      type: "artifact.reported",
      payload: { name: "report.md", workspaceRelativePath: "artifacts/report.md" },
    });

    const replay = stream.replay(session.id, 1);
    expect(replay.map((event) => event.id)).toEqual([2, 3]);
    expect(JSON.stringify(replay)).not.toContain("secret-token");
    expect(new Set(replay.map((event) => event.event))).toEqual(
      new Set(["tool.call.started", "artifact.reported"]),
    );

    const followed = firstValueFrom(stream.stream(session.id, 2).pipe(take(2), toArray()));
    events.ingestRawEvent(session.id, {
      sourceEventId: "evt-4",
      type: "session.output.delta",
      payload: { text: "Live update" },
    });

    const messages = await followed;
    expect(messages.map((event) => event.id)).toEqual([3, 4]);
    expect(messages[1]).toMatchObject({
      event: "session.output.delta",
      data: { sequence: 4, data: { text: "Live update" } },
    });
  });
});
