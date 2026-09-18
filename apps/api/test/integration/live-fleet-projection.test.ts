import { describe, expect, it } from "vitest";
import { CommandCenterService } from "../../src/modules/command-center/command-center.service.js";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("live fleet projection", () => {
  it("contains only nonterminal sessions and removes every terminal outcome", async () => {
    const fixture = await createReadyAgentFixture();
    const commandCenter = new CommandCenterService(
      fixture.sessions,
      fixture.events,
      fixture.artifacts,
      fixture.audit,
      fixture.projector,
    );
    const sessions = await Promise.all(
      ["completed", "failed", "canceled", "interrupted"].map(() =>
        fixture.sessions.startSession(fixture.workspaceId, fixture.actorId, {
          agentId: fixture.publishedAgent.id,
          input: "Investigate run",
        }),
      ),
    );

    expect(await commandCenter.getLiveFleet(fixture.workspaceId)).toHaveLength(4);
    await Promise.all(
      sessions.map((session, index) =>
        fixture.sessions.transition(
          fixture.workspaceId,
          fixture.actorId,
          session.id,
          ["completed", "failed", "canceled", "interrupted"][index] as never,
        ),
      ),
    );
    expect(await commandCenter.getLiveFleet(fixture.workspaceId)).toEqual([]);
    expect(await commandCenter.listHistory(fixture.workspaceId)).toHaveLength(4);
  });
});
