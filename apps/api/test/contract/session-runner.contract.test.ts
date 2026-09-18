import { describe, expect, it } from "vitest";
import {
  cancelSessionResponseSchema,
  sessionSchema,
  sessionStartRequestSchema,
  sessionStatusSchema,
  workspaceEnvironmentSchema,
  workspaceHealthSchema,
} from "@adlc/contracts";

describe("session runner contracts", () => {
  const agentId = "00000000-0000-4000-8000-000000000101";
  const agentVersionId = "00000000-0000-4000-8000-000000000102";

  it("describes the single self-hosted workspace and health validation responses", () => {
    expect(
      workspaceEnvironmentSchema.parse({
        id: "00000000-0000-4000-8000-000000000103",
        type: "self_hosted",
        workspacePath: "/workspace/adlc",
        connectorId: "00000000-0000-4000-8000-000000000104",
        status: "valid",
        executorCredentialHealth: "healthy",
      }),
    ).toMatchObject({ type: "self_hosted", executorCredentialHealth: "healthy" });

    expect(
      workspaceHealthSchema.parse({
        status: "healthy",
        connector: "online",
        canProbeReachability: false,
        filesystem: "healthy",
        executor: "available",
        checkedAt: "2026-09-18T00:00:00.000Z",
        issues: [],
      }).status,
    ).toBe("healthy");
  });

  it("requires published-agent session starts and exposes all terminal outcomes", () => {
    expect(() => sessionStartRequestSchema.parse({ agentId, input: "" })).toThrow();

    for (const status of ["completed", "failed", "canceled", "interrupted"]) {
      expect(sessionStatusSchema.parse(status)).toBe(status);
    }
  });

  it("accepts start, get, and cancel session response bodies", () => {
    const session = sessionSchema.parse({
      id: "00000000-0000-4000-8000-000000000105",
      agentId,
      agentVersionId,
      status: "provisioning",
      executorStatus: "requested",
      input: "Create a Markdown report.",
      snapshotSummary: {
        schemaVersion: 1,
        approvalMode: "always_allow",
        capabilities: ["planning", "devops"],
      },
      createdAt: "2026-09-18T00:00:00.000Z",
      startedAt: "2026-09-18T00:00:01.000Z",
      terminalAt: null,
      failureSummary: null,
    });

    expect(session.status).toBe("provisioning");
    expect(cancelSessionResponseSchema.parse({ ...session, status: "canceled" }).status).toBe(
      "canceled",
    );
  });
});
