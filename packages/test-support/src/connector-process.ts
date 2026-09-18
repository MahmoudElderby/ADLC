import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONNECTOR_TOKEN } from "./operator-fixture.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const execFileAsync = promisify(execFile);

export type ConnectorProcessEnv = {
  extraEnv?: Record<string, string | undefined>;
};

export type ConnectorProcessHandle = {
  pid: number | undefined;
  stop: () => Promise<void>;
  restart: () => Promise<ConnectorProcessHandle>;
};

function childExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode) {
    return;
  }
  const exited = childExit(child);
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5_000);
  });
  await Promise.race([exited, timeout]);
}

async function connectorPids(): Promise<number[]> {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'workspace-connector' } | Select-Object -ExpandProperty ProcessId",
      ]);
      return stdout
        .split(/\s+/)
        .map(Number)
        .filter((pid) => Number.isInteger(pid) && pid > 0);
    } catch {
      return [];
    }
  }
  try {
    const { stdout } = await execFileAsync("ps", ["-eo", "pid,args"]);
    return stdout
      .split(/\n/)
      .filter((line) => /workspace-connector/i.test(line) && /tsx|pnpm|node/i.test(line))
      .map((line) => Number(line.trim().split(/\s+/)[0]))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

async function killPid(pid: number): Promise<void> {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
}

export async function killConnectorProcesses(): Promise<void> {
  const toKill = await connectorPids();
  await Promise.all(toKill.map((pid) => killPid(pid)));
  const started = Date.now();
  while (Date.now() - started < 8_000) {
    const remaining = await connectorPids();
    if (remaining.length === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

function buildEnv(input: ConnectorProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ADLC_API_URL: process.env.ADLC_API_URL ?? "http://127.0.0.1:3000/api/v1",
    ADLC_CONNECTOR_TOKEN: process.env.ADLC_CONNECTOR_TOKEN ?? DEFAULT_CONNECTOR_TOKEN,
    ADLC_CONNECTOR_REGISTRATION_TOKEN:
      process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "replace-with-registration-secret-min-24",
    ADLC_WORKSPACE_PATH: process.env.ADLC_WORKSPACE_PATH ?? "C:/tmp/adlc-workspace",
    ...input.extraEnv,
  };
}

export async function startConnectorProcess(
  input: ConnectorProcessEnv = {},
): Promise<ConnectorProcessHandle> {
  const child = spawn("pnpm", ["exec", "tsx", "src/main.ts"], {
    cwd: path.join(repoRoot, "apps/workspace-connector"),
    env: buildEnv(input),
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 1_500));

  const handle: ConnectorProcessHandle = {
    pid: child.pid,
    stop: async () => {
      await stopChild(child);
    },
    restart: async () => {
      await stopChild(child);
      return startConnectorProcess(input);
    },
  };
  return handle;
}

export async function replaceConnectorProcess(
  input: ConnectorProcessEnv = {},
): Promise<ConnectorProcessHandle> {
  await killConnectorProcesses();
  return startConnectorProcess(input);
}
