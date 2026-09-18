import { type CommandEnvelope, validateReplaySafeCommand } from "../security/control-plane-auth.js";
import { ConnectorControlPlaneClient, type CommandResult } from "./control-plane.client.js";

export { ConnectorControlPlaneClient };

export type ExecutorStarter = {
  approvedWorkspacePath: string;
  completedCommandIds?: ReadonlySet<string>;
  start: (command: Extract<CommandEnvelope, { type: "start_executor" }>) => Promise<{
    executorStatus: "connected" | "failed";
  }>;
  stop?: (command: Extract<CommandEnvelope, { type: "stop_executor" }>) => Promise<{
    executorStatus: "stopped" | "failed";
  }>;
};

export function buildExecutorInvocation(
  command: Extract<CommandEnvelope, { type: "start_executor" }>,
  approvedWorkspacePath: string,
): string[] {
  if (command.workspacePath !== approvedWorkspacePath) {
    throw new Error("Command workspace path does not match approved workspace.");
  }

  return [
    "codex",
    "exec-server",
    "--remote",
    command.remoteUrl,
    "--environment-id",
    command.environmentId,
  ];
}

export async function runCommandLoopOnce(
  client: Pick<ConnectorControlPlaneClient, "nextCommand" | "reportResult">,
  executor: ExecutorStarter,
): Promise<void> {
  const command = await client.nextCommand(25);
  if (!command) {
    return;
  }

  const observedAt = new Date().toISOString();

  try {
    const validated = validateReplaySafeCommand(command, executor.completedCommandIds ?? new Set());
    let executorStatus: CommandResult["executorStatus"];

    if (validated.type === "start_executor") {
      buildExecutorInvocation(validated, executor.approvedWorkspacePath);
      executorStatus = (await executor.start(validated)).executorStatus;
    } else {
      executorStatus = (await executor.stop?.(validated))?.executorStatus ?? "stopped";
    }

    await client.reportResult(validated.commandId, {
      status: executorStatus === "failed" ? "failed" : "succeeded",
      executorStatus,
      observedAt,
      errorCode: null,
      message: null,
    });
  } catch (error) {
    await client.reportResult(command.commandId, {
      status: "failed",
      executorStatus: "failed",
      observedAt,
      errorCode: "command_rejected",
      message: error instanceof Error ? error.message : "Command rejected.",
    });
  }
}
