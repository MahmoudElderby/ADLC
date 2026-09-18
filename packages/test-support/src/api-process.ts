import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { createConnection, createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONNECTOR_TOKEN,
  DEFAULT_OPERATOR_DISPLAY_NAME,
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  DEFAULT_WORKSPACE_NAME,
} from "./operator-fixture.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const execFileAsync = promisify(execFile);

export type ApiProcessEnv = {
  databaseUrl: string;
  port?: number;
  host?: string;
  extraEnv?: Record<string, string | undefined>;
};

export type ApiProcessHandle = {
  pid: number | undefined;
  port: number;
  host: string;
  baseUrl: string;
  databaseUrl: string;
  stop: () => Promise<void>;
  restart: () => Promise<ApiProcessHandle>;
};

async function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate a free TCP port for the API process."));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function childExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

async function waitForTcp(host: string, port: number, timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`API process did not listen on ${host}:${port}: ${String(lastError)}`);
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

function buildEnv(input: ApiProcessEnv, port: number, host: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "test",
    DATABASE_URL: input.databaseUrl,
    API_PORT: String(port),
    PORT: String(port),
    HOST: host,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "test-openai-key",
    SECRET_ENCRYPTION_KEY:
      process.env.SECRET_ENCRYPTION_KEY ?? "ci-secret-encryption-key-32-bytes",
    ADLC_OPERATOR_EMAIL: process.env.ADLC_OPERATOR_EMAIL ?? DEFAULT_OPERATOR_EMAIL,
    ADLC_OPERATOR_PASSWORD: process.env.ADLC_OPERATOR_PASSWORD ?? DEFAULT_OPERATOR_PASSWORD,
    ADLC_OPERATOR_DISPLAY_NAME:
      process.env.ADLC_OPERATOR_DISPLAY_NAME ?? DEFAULT_OPERATOR_DISPLAY_NAME,
    ADLC_WORKSPACE_NAME: process.env.ADLC_WORKSPACE_NAME ?? DEFAULT_WORKSPACE_NAME,
    ADLC_CONNECTOR_REGISTRATION_TOKEN:
      process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "replace-with-registration-secret-min-24",
    ADLC_CONNECTOR_TOKEN: process.env.ADLC_CONNECTOR_TOKEN ?? DEFAULT_CONNECTOR_TOKEN,
    ADLC_SESSION_IDLE_SECONDS: process.env.ADLC_SESSION_IDLE_SECONDS ?? "28800",
    ADLC_SESSION_ABSOLUTE_SECONDS: process.env.ADLC_SESSION_ABSOLUTE_SECONDS ?? "86400",
    ...input.extraEnv,
  };
}

export async function startApiProcess(input: ApiProcessEnv): Promise<ApiProcessHandle> {
  const host = input.host ?? "127.0.0.1";
  const allocatedPort = input.port && input.port > 0 ? input.port : await allocatePort();

  const env = buildEnv(input, allocatedPort, host);
  const child = spawn("pnpm", ["exec", "tsx", "src/main.ts"], {
    cwd: path.join(repoRoot, "apps/api"),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true,
  });

  const stderr: string[] = [];
  child.stderr?.on("data", (chunk) => {
    stderr.push(String(chunk));
  });
  child.stdout?.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      stderr.push(`API process exited early (${code}, ${signal ?? "no-signal"})`);
    }
  });

  const baseUrl = `http://${host}:${allocatedPort}`;
  try {
    await waitForTcp(host, allocatedPort);
    await waitForHttpOk(`${baseUrl}/api/v1/health`);
  } catch (error) {
    await stopChild(child);
    throw new Error(`${String(error)}\n${stderr.join("")}`);
  }

  const handle: ApiProcessHandle = {
    pid: child.pid,
    port: allocatedPort,
    host,
    baseUrl,
    databaseUrl: input.databaseUrl,
    stop: async () => {
      await stopChild(child);
    },
    restart: async () => {
      await stopChild(child);
      return startApiProcess({
        databaseUrl: input.databaseUrl,
        port: allocatedPort,
        host,
        extraEnv: input.extraEnv,
      });
    },
  };

  return handle;
}

export async function stopApiProcess(handle: ApiProcessHandle): Promise<void> {
  await handle.stop();
}

export async function restartApiProcess(handle: ApiProcessHandle): Promise<ApiProcessHandle> {
  return handle.restart();
}

async function waitForHttpOk(url: string, timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`API health check failed for ${url}: ${String(lastError)}`);
}

async function pidsListeningOnPort(port: number): Promise<number[]> {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "TCP"]);
      const pids = new Set<number>();
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) {
          continue;
        }
        const match = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, "i"));
        if (match?.[1]) {
          pids.add(Number(match[1]));
        }
      }
      return [...pids].filter((pid) => Number.isInteger(pid) && pid > 0);
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-ti", `tcp:${port}`]);
    return stdout
      .split(/\s+/)
      .map(Number)
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

export async function killListenerOnPort(port: number): Promise<void> {
  const listeners = await pidsListeningOnPort(port);
  await Promise.all(listeners.map((pid) => killPid(pid)));

  const started = Date.now();
  while (Date.now() - started < 8_000) {
    const remaining = await pidsListeningOnPort(port);
    if (remaining.length === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

function detachedHandle(input: ApiProcessEnv & { port: number; host: string }): ApiProcessHandle {
  const host = input.host;
  return {
    pid: undefined,
    port: input.port,
    host,
    baseUrl: `http://${host}:${input.port}`,
    databaseUrl: input.databaseUrl,
    stop: async () => {
      await killListenerOnPort(input.port);
    },
    restart: async () => replaceApiProcessOnPort(input),
  };
}

export async function replaceApiProcessOnPort(input: ApiProcessEnv & { port: number }): Promise<ApiProcessHandle> {
  const host = input.host ?? "127.0.0.1";
  await killListenerOnPort(input.port);
  try {
    await waitForTcp(host, input.port, 20_000);
    await waitForHttpOk(`http://${host}:${input.port}/api/v1/health`, 15_000);
    return detachedHandle({ ...input, host });
  } catch {
    return startApiProcess({ ...input, host });
  }
}
