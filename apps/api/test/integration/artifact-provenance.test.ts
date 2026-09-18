import { describe, expect, it } from "vitest";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("artifact provenance", () => {
  it("creates one artifact per report occurrence and allows repeated paths", async () => {
    const { sessions, artifacts, workspaceId, actorId, publishedAgent } =
      await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Create a Markdown report.",
    });

    const first = await artifacts.recordArtifactReport(session, {
      sourceEventId: "artifact-1",
      name: "report.md",
      workspaceRelativePath: "artifacts/report.md",
    });
    const second = await artifacts.recordArtifactReport(session, {
      sourceEventId: "artifact-2",
      name: "report.md",
      workspaceRelativePath: "artifacts/report.md",
    });

    expect(first.id).not.toBe(second.id);
    expect(await artifacts.listSessionArtifacts(workspaceId, session.id)).toHaveLength(2);
    expect(
      await artifacts.listSessionArtifacts("00000000-0000-4000-8000-000000000399", session.id),
    ).toHaveLength(0);
  });

  it("enforces markdown type and workspace containment without losing the session", async () => {
    const { sessions, artifacts, workspaceId, actorId, publishedAgent } =
      await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Create a Markdown report.",
    });

    expect(
      (
        await artifacts.recordArtifactReport(session, {
          sourceEventId: "artifact-outside",
          name: "escape.md",
          workspaceRelativePath: "../escape.md",
        })
      ).status,
    ).toBe("outside_workspace");
    expect(
      (
        await artifacts.recordArtifactReport(session, {
          sourceEventId: "artifact-type",
          name: "report.txt",
          workspaceRelativePath: "artifacts/report.txt",
        })
      ).status,
    ).toBe("invalid_type");
    expect((await sessions.getSession(workspaceId, session.id)).id).toBe(session.id);
  });
});
