import { describe, expect, it } from "vitest";
import { createReadyAgentFixture } from "./support/us2-fixtures.js";

describe("session readiness", () => {
  it("blocks draft agents and unhealthy workspace starts with explanations", async () => {
    const { sessions, workspaceId, actorId, draftAgent } = await createReadyAgentFixture({
      publish: false,
    });

    await expect(
      sessions.startSession(workspaceId, actorId, {
        agentId: draftAgent.id,
        input: "Create a Markdown report.",
      }),
    ).rejects.toThrow("published");

    sessions.workspaceEnvironmentService.setHealth({
      status: "unavailable",
      connector: "offline",
      filesystem: "healthy",
      executor: "available",
      checkedAt: "2026-09-18T00:00:00.000Z",
      issues: ["Connector heartbeat is stale."],
    });

    const publishedAgent = await sessions.agentRegistryService.publish(
      workspaceId,
      actorId,
      draftAgent.id,
    );

    await expect(
      sessions.startSession(workspaceId, actorId, {
        agentId: publishedAgent.id,
        input: "Create a Markdown report.",
      }),
    ).rejects.toThrow("Connector heartbeat is stale");
  });

  it("creates internal runtime command material without exposing secrets in responses", async () => {
    const { sessions, workspaceId, actorId, publishedAgent } = await createReadyAgentFixture();
    const session = await sessions.startSession(workspaceId, actorId, {
      agentId: publishedAgent.id,
      input: "Use bearer sk-secret-12345678 and create report.md",
    });

    expect(sessions.getRuntimeSecret(session.id)).toMatch(/^wss:\/\//);
    expect(JSON.stringify(session)).not.toContain("wss://");
    expect(JSON.stringify(session.snapshotSummary)).not.toContain("sk-secret-12345678");
    expect(JSON.stringify(session.snapshotSummary)).not.toContain(
      sessions.getRuntimeSecret(session.id),
    );
    expect(session.snapshotSummary).toMatchObject({
      schemaVersion: 1,
      workspace: { type: "self_hosted" },
      agent: { id: publishedAgent.id, approvalMode: "always_allow" },
    });

    const claimed = sessions.claimRuntimeSecret(session.id);
    expect(claimed).toMatch(/^wss:\/\//);
    expect(sessions.getRuntimeSecret(session.id)).toBeUndefined();
  });

  it("checks current capability reachability before session start", async () => {
    const { sessions, workspaceId, actorId, publishedAgent, mcp } = await createReadyAgentFixture();
    sessions.capabilityRegistryService.forceMcpStatus(workspaceId, mcp.id, "unreachable");

    await expect(
      sessions.startSession(workspaceId, actorId, {
        agentId: publishedAgent.id,
        input: "Create a Markdown report.",
      }),
    ).rejects.toThrow("must be valid before session start");
  });
});
