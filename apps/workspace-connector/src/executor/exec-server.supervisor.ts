import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { CommandEnvelope } from "../security/control-plane-auth.js";
import { buildExecutorInvocation } from "../control-plane/command-loop.js";

export class ExecServerSupervisor {
  private readonly processes = new Map<string, ChildProcessWithoutNullStreams>();

  constructor(private readonly approvedWorkspacePath: string) {}

  async start(command: Extract<CommandEnvelope, { type: "start_executor" }>) {
    const invocation = buildExecutorInvocation(command, this.approvedWorkspacePath);
    const child = spawn(invocation[0]!, invocation.slice(1), {
      cwd: this.approvedWorkspacePath,
      env: {
        PATH: process.env.PATH,
        OPENAI_EXECUTOR_API_KEY: process.env.OPENAI_EXECUTOR_API_KEY,
      },
      stdio: "pipe",
    });
    this.processes.set(command.sessionId, child);
    return { executorStatus: "connected" as const };
  }

  async stop(command: Extract<CommandEnvelope, { type: "stop_executor" }>) {
    const processForSession = this.processes.get(command.sessionId);
    processForSession?.kill("SIGTERM");
    this.processes.delete(command.sessionId);
    return { executorStatus: "stopped" as const };
  }
}
