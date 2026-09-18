import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";

export const TEST_MCP_PROTOCOL_VERSION = "2025-03-26";
export const TEST_MCP_DEFAULT_CREDENTIAL = "test-mcp-credential";
export const TEST_MCP_DEFAULT_TOOLS = ["search"] as const;

export type TestMcpMode = "tools" | "none";

export type TestMcpServerOptions = {
  host?: string;
  port?: number;
  mode?: TestMcpMode;
  tools?: string[];
  credential?: string | null;
};

export type TestMcpServer = {
  url: string;
  host: string;
  port: number;
  credential: string | null;
  mode: TestMcpMode;
  tools: string[];
  close: () => Promise<void>;
};

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function advertisedTools(options: Required<Pick<TestMcpServerOptions, "mode" | "tools">>): {
  name: string;
  description: string;
}[] {
  if (options.mode === "none") {
    return [];
  }
  return options.tools.map((name) => ({
    name,
    description: `Test MCP tool ${name}`,
  }));
}

function isAuthorized(request: IncomingMessage, credential: string | null): boolean {
  if (!credential) {
    return true;
  }
  const header = request.headers.authorization;
  return header === `Bearer ${credential}`;
}

function handleJsonRpc(
  message: JsonRpcRequest,
  options: { mode: TestMcpMode; tools: string[] },
): unknown {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      result: {
        protocolVersion: TEST_MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "adlc-test-mcp", version: "0.1.0" },
      },
    };
  }

  if (message.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      result: {
        tools: advertisedTools(options),
      },
    };
  }

  if (message.method === "notifications/initialized" || message.method === "initialized") {
    return null;
  }

  return {
    jsonrpc: "2.0",
    id: message.id ?? null,
    error: { code: -32601, message: "Method not found" },
  };
}

export function createTestMcpHandler(options: TestMcpServerOptions = {}) {
  const mode = options.mode ?? "tools";
  const tools = options.tools ?? [...TEST_MCP_DEFAULT_TOOLS];
  const credential =
    options.credential === undefined ? TEST_MCP_DEFAULT_CREDENTIAL : options.credential;

  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method === "GET" || request.method === "HEAD") {
      // Intentional non-handshake response: HTTP ping/GET MUST NOT count as reachable.
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("ok");
      return;
    }

    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST, GET, HEAD" });
      response.end();
      return;
    }

    if (!isAuthorized(request, credential)) {
      sendJson(response, 401, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Unauthorized" },
      });
      return;
    }

    const raw = await readBody(request);
    let message: JsonRpcRequest;
    try {
      message = JSON.parse(raw) as JsonRpcRequest;
    } catch {
      sendJson(response, 400, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
      return;
    }

    const rpc = handleJsonRpc(message, { mode, tools });
    if (rpc === null) {
      response.writeHead(202);
      response.end();
      return;
    }
    sendJson(response, 200, rpc);
  };
}

export async function startTestMcpServer(
  options: TestMcpServerOptions = {},
): Promise<TestMcpServer> {
  const host = options.host ?? "127.0.0.1";
  const mode = options.mode ?? "tools";
  const tools = options.tools ?? [...TEST_MCP_DEFAULT_TOOLS];
  const credential =
    options.credential === undefined ? TEST_MCP_DEFAULT_CREDENTIAL : options.credential;
  const handler = createTestMcpHandler({ ...options, host, mode, tools, credential });
  const server: Server = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Test MCP server failed to bind a TCP port.");
  }

  return {
    url: `http://${host}:${address.port}/mcp`,
    host,
    port: address.port,
    credential,
    mode,
    tools,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

export function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const invokedAsCli = process.argv[1]?.replaceAll("\\", "/").includes("test-mcp-server");

if (invokedAsCli) {
  const mode = (parseArg("mode") as TestMcpMode | undefined) ?? "tools";
  const port = Number(parseArg("port") ?? 8080);
  const host = parseArg("host") ?? "0.0.0.0";
  const credential = parseArg("credential") ?? TEST_MCP_DEFAULT_CREDENTIAL;
  const tools = parseArg("tools")?.split(",").filter(Boolean);
  void startTestMcpServer({ mode, port, host, credential, tools }).then((server) => {
    process.stdout.write(`test-mcp listening on ${server.url} mode=${server.mode}\n`);
  });
}
