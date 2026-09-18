import { describe, expect, it } from "vitest";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("observability performance budget", () => {
  it("makes representative status and artifact evidence visible within the R0 budgets", async () => {
    const fixture = await createReadyAgentFixture();
    const session = await fixture.sessions.startSession(fixture.workspaceId, fixture.actorId, {
      agentId: fixture.publishedAgent.id,
      input: "Create a report",
    });
    const started = performance.now();
    for (let index = 0; index < 238; index += 1) {
      fixture.events.ingestRawEvent(session.id, {
        sourceEventId: `event-${index}`,
        type: index === 249 ? "artifact.reported" : "session.output.delta",
        payload: { text: `progress ${index}`, name: "report.md" },
      });
    }
    const statusVisibleAt = performance.now();
    for (let index = 238; index < 250; index += 1) {
      fixture.events.ingestRawEvent(session.id, {
        sourceEventId: `event-${index}`,
        type: index === 249 ? "artifact.reported" : "session.output.delta",
        payload: { text: `progress ${index}`, name: "report.md" },
      });
    }
    const artifactVisibleAt = performance.now();
    fixture.artifacts.recordArtifactReport(session, {
      sourceEventId: "event-249",
      name: "report.md",
      workspaceRelativePath: "artifacts/report.md",
    });
    const elapsed = performance.now() - started;

    expect(fixture.events.listNormalized(session.id)).toHaveLength(250);
    expect(fixture.artifacts.listSessionArtifacts(fixture.workspaceId, session.id)).toHaveLength(1);
    expect(statusVisibleAt - started).toBeLessThan(2_000);
    expect(artifactVisibleAt - started).toBeLessThan(5_000);
    expect(elapsed).toBeLessThan(5_000);
  });
});
