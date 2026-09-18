export const MCP_PROTOCOL_VERSION = "2025-03-26";

export type McpHandshakeInput = {
  serverUrl: string;
  allowedTools: string[];
  credential?: string | null;
};

export type McpHandshakeResult = {
  handshake: "accepted" | "rejected" | "not_attempted";
  allowedToolsPresent: boolean;
  reachability: "reachable" | "unreachable";
  errorCode: string | null;
  message: string | null;
};

function redact(value: string): string {
  return value
    .replace(/bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/authorization:\s*[^\s]+/gi, "Authorization: [REDACTED]")
    .slice(0, 240);
}

async function rpc(
  serverUrl: string,
  credential: string | null | undefined,
  method: string,
  params: Record<string, unknown>,
  id: number,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (credential) {
    headers.Authorization = `Bearer ${credential}`;
  }
  const response = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

export async function handshakeMcp(input: McpHandshakeInput): Promise<McpHandshakeResult> {
  const credential = input.credential ?? null;
  try {
    const initialized = await rpc(
      input.serverUrl,
      credential,
      "initialize",
      {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "adlc-workspace-connector", version: "0.2.0" },
      },
      1,
    );
    if (initialized.status === 401 || initialized.status === 403) {
      return {
        handshake: "rejected",
        allowedToolsPresent: false,
        reachability: "unreachable",
        errorCode: "unauthorized",
        message: "MCP handshake was rejected.",
      };
    }
    if (initialized.status >= 400 || !initialized.body || initialized.body.error) {
      return {
        handshake: "rejected",
        allowedToolsPresent: false,
        reachability: "unreachable",
        errorCode: "handshake_rejected",
        message: "MCP initialize did not succeed.",
      };
    }

    const listed = await rpc(input.serverUrl, credential, "tools/list", {}, 2);
    const result = (listed.body?.result ?? {}) as { tools?: { name?: string }[] };
    const names = Array.isArray(result.tools)
      ? result.tools.map((tool) => String(tool.name ?? "")).filter(Boolean)
      : [];
    const allowedToolsPresent = input.allowedTools.some((tool) => names.includes(tool));
    return {
      handshake: "accepted",
      allowedToolsPresent,
      reachability: allowedToolsPresent ? "reachable" : "unreachable",
      errorCode: allowedToolsPresent ? null : "missing_allowed_tools",
      message: allowedToolsPresent
        ? null
        : "None of the allowed tools are advertised.",
    };
  } catch (error) {
    return {
      handshake: "not_attempted",
      allowedToolsPresent: false,
      reachability: "unreachable",
      errorCode: "connection_failed",
      message: redact(error instanceof Error ? error.message : "MCP handshake failed."),
    };
  } finally {
    input.credential = null;
  }
}
