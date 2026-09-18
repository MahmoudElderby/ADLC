import { ConnectorControlPlaneClient, runCommandLoopOnce } from "./control-plane/command-loop.js";
import { ExecServerSupervisor } from "./executor/exec-server.supervisor.js";

const requiredEnvironment = [
  "ADLC_API_URL",
  "ADLC_CONNECTOR_TOKEN",
  "ADLC_WORKSPACE_PATH",
] as const;

const missingVariables = requiredEnvironment.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.warn(`Workspace connector missing configuration: ${missingVariables.join(", ")}`);
} else {
  const approvedWorkspacePath = process.env.ADLC_WORKSPACE_PATH!;
  const client = new ConnectorControlPlaneClient({
    apiUrl: process.env.ADLC_API_URL!,
    connectorId: process.env.ADLC_CONNECTOR_ID ?? "00000000-0000-4000-8000-00000000e002",
    token: process.env.ADLC_CONNECTOR_TOKEN!,
  });
  const supervisor = new ExecServerSupervisor(approvedWorkspacePath);

  const tick = async () => {
    await client.heartbeat().catch(() => undefined);
    await runCommandLoopOnce(client, {
      approvedWorkspacePath,
      start: (command) => supervisor.start(command),
      stop: (command) => supervisor.stop(command),
    }).catch((error) => {
      console.warn("Connector command loop failed", error);
    });
  };

  void tick();
  setInterval(() => {
    void tick();
  }, 5_000);
}

console.log("ADLC workspace connector command loop started.");
