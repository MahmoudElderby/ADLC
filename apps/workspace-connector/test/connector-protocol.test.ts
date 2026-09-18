import { describe, expect, it, vi } from "vitest";
import {
  buildExecutorInvocation,
  ConnectorControlPlaneClient,
  runCommandLoopOnce,
} from "../src/control-plane/command-loop.js";
import { validateReplaySafeCommand } from "../src/security/control-plane-auth.js";

describe("workspace connector protocol", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const command = {
    commandId: "00000000-0000-4000-8000-000000000201",
    type: "start_executor" as const,
    sessionId: "00000000-0000-4000-8000-000000000202",
    environmentId: "env_123",
    remoteUrl: "wss://session.openai.example.test/run",
    workspacePath: "/workspace/adlc",
    expiresAt: future,
  };

  it("authenticates requests and rejects replayed command IDs", () => {
    const client = new ConnectorControlPlaneClient({
      apiUrl: "https://adlc.example.test",
      connectorId: "00000000-0000-4000-8000-000000000203",
      token: "connector-token",
    });

    expect(client.authorizationHeader()).toBe("Bearer connector-token");
    expect(() => validateReplaySafeCommand(command, new Set([command.commandId]))).toThrow(
      "Command replay rejected",
    );
  });

  it("uses the fixed official executor invocation and rejects arbitrary shell requests", () => {
    expect(buildExecutorInvocation(command, "/workspace/adlc")).toEqual([
      "codex",
      "exec-server",
      "--remote",
      command.remoteUrl,
      "--environment-id",
      command.environmentId,
    ]);

    expect(() =>
      buildExecutorInvocation(
        { ...command, workspacePath: "/tmp/other", remoteUrl: "wss://session.openai.test/run" },
        "/workspace/adlc",
      ),
    ).toThrow("approved workspace");

    expect(() =>
      validateReplaySafeCommand(
        {
          commandId: "00000000-0000-4000-8000-000000000204",
          type: "shell",
          command: "rm -rf /",
          expiresAt: future,
        },
        new Set(),
      ),
    ).toThrow();
  });

  it("long-polls one command and reports an idempotent result", async () => {
    const start = vi.fn(async () => ({ executorStatus: "connected" as const }));
    const client = {
      nextCommand: vi.fn(async () => command),
      reportResult: vi.fn(async () => undefined),
    };

    await runCommandLoopOnce(client, { approvedWorkspacePath: "/workspace/adlc", start });

    expect(client.nextCommand).toHaveBeenCalledWith(25);
    expect(start).toHaveBeenCalledWith(command);
    expect(client.reportResult).toHaveBeenCalledWith(command.commandId, {
      status: "succeeded",
      executorStatus: "connected",
      observedAt: expect.any(String),
      errorCode: null,
      message: null,
    });
  });
});
