import { handshakeMcp } from "../health/mcp-handshake.js";
import { probeEnvironmentHealth } from "../health/environment-health.js";

const ALLOWED_CHECK_TYPES = new Set(["mcp_reachability", "environment_health"]);
const DISALLOWED_FIELD = /^(exec|start|stop|shell|command|argv|cwd)/i;

export type ConnectorLoopOptions = {
  apiUrl: string;
  connectorId: string;
  token: string;
  workspacePath: string;
};

export type EnvironmentCheck = {
  checkId: string;
  type: string;
  mcpId?: string;
  serverUrl?: string;
  allowedTools?: string[];
  credential?: string;
  workspacePath?: string;
  expiresAt: string;
  exec?: unknown;
  start?: unknown;
  stop?: unknown;
  [key: string]: unknown;
};

export function controlPlaneOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/$/, "").replace(/\/api\/v1$/i, "");
}

function connectorUrl(apiUrl: string, connectorId: string, suffix: string): string {
  return `${controlPlaneOrigin(apiUrl)}/api/v1/connectors/${connectorId}${suffix}`;
}

export function assertAllowedCheck(check: EnvironmentCheck): EnvironmentCheck {
  if (!ALLOWED_CHECK_TYPES.has(check.type)) {
    throw new Error("Unsupported environment check type.");
  }
  if (new Date(check.expiresAt).getTime() <= Date.now()) {
    throw new Error("Environment check expired.");
  }
  for (const key of Object.keys(check)) {
    if (DISALLOWED_FIELD.test(key) && check[key] !== undefined && check[key] !== null) {
      throw new Error("Environment check payload contains a disallowed field.");
    }
  }
  return check;
}

async function authorizedFetch(
  url: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

export async function runCheckOnce(options: ConnectorLoopOptions): Promise<"ok" | "unauthorized"> {
  const heartbeat = await authorizedFetch(connectorUrl(options.apiUrl, options.connectorId, "/heartbeat"), options.token, {
    method: "POST",
    body: JSON.stringify({
      connectorVersion: "0.2.0",
      hostFingerprint: "workspace-connector",
      observedAt: new Date().toISOString(),
      workspace: { readable: true, writable: true },
    }),
  }).catch(() => undefined);
  if (heartbeat?.status === 401) {
    return "unauthorized";
  }

  const next = await authorizedFetch(
    connectorUrl(options.apiUrl, options.connectorId, "/checks/next?waitSeconds=0"),
    options.token,
  ).catch(() => undefined);
  if (!next || next.status === 204) {
    return "ok";
  }
  if (next.status === 401) {
    return "unauthorized";
  }
  if (!next.ok) {
    return "ok";
  }

  const check = (await next.json()) as EnvironmentCheck;
  assertAllowedCheck(check);

  if (check.type === "environment_health") {
    const health = await probeEnvironmentHealth(check.workspacePath ?? options.workspacePath);
    await authorizedFetch(
      connectorUrl(options.apiUrl, options.connectorId, `/checks/${check.checkId}/result`),
      options.token,
      {
        method: "POST",
        body: JSON.stringify({
          status: "answered",
          filesystem: health.filesystem,
          observedAt: new Date().toISOString(),
          errorCode: null,
          message: health.message,
        }),
      },
    );
    return "ok";
  }

  const handshake = await handshakeMcp({
    serverUrl: String(check.serverUrl ?? ""),
    allowedTools: Array.isArray(check.allowedTools) ? check.allowedTools.map(String) : [],
    credential: typeof check.credential === "string" ? check.credential : null,
  });
  check.credential = undefined;

  await authorizedFetch(
    connectorUrl(options.apiUrl, options.connectorId, `/checks/${check.checkId}/result`),
    options.token,
    {
      method: "POST",
      body: JSON.stringify({
        status: "answered",
        reachability: handshake.reachability,
        handshake: handshake.handshake,
        allowedToolsPresent: handshake.allowedToolsPresent,
        observedAt: new Date().toISOString(),
        errorCode: handshake.errorCode,
        message: handshake.message,
      }),
    },
  );
  return "ok";
}

export async function registerConnector(options: {
  apiUrl: string;
  registrationToken: string;
  workspacePath: string;
}): Promise<{ connectorId: string; token: string } | null> {
  const response = await fetch(`${controlPlaneOrigin(options.apiUrl)}/api/v1/connectors/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.registrationToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "self-hosted-connector",
      hostFingerprint: "workspace-connector",
      connectorVersion: "0.2.0",
      workspacePath: options.workspacePath,
    }),
  }).catch(() => undefined);
  if (!response?.ok) {
    return null;
  }
  return (await response.json()) as { connectorId: string; token: string };
}
