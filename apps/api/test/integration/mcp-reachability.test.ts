import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { environmentChecks, mcpServers, workspaceConnectors } from "@adlc/database";
import { eq } from "drizzle-orm";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  createTestMcpHandler,
  getSharedTestPostgres,
  seedOperator,
  startTestMcpServer,
  TEST_MCP_DEFAULT_CREDENTIAL,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

const registrationToken =
  process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "replace-with-registration-secret-min-24";

describe("MCP reachability and workspace isolation", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  async function signIn() {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    const cookie = cookieHeader(response.headers["set-cookie"])!;
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    return { cookie, identity: me.json() as { userId: string; workspaceId: string } };
  }

  async function registerConnector() {
    const registered = await app.inject({
      method: "POST",
      url: "/api/v1/connectors/register",
      headers: { authorization: `Bearer ${registrationToken}` },
      payload: {
        name: "test-connector",
        hostFingerprint: "test-host",
        connectorVersion: "0.2.0",
        workspacePath: "C:/tmp/adlc-workspace",
      },
    });
    expect(registered.statusCode).toBe(201);
    const body = registered.json() as { connectorId: string; token: string };
    const heartbeat = await app.inject({
      method: "POST",
      url: `/api/v1/connectors/${body.connectorId}/heartbeat`,
      headers: { authorization: `Bearer ${body.token}` },
      payload: {
        connectorVersion: "0.2.0",
        hostFingerprint: "test-host",
        observedAt: new Date().toISOString(),
        workspace: { readable: true, writable: true },
      },
    });
    expect(heartbeat.statusCode).toBe(200);
    expect(JSON.stringify(heartbeat.json())).not.toMatch(/start_executor|credential/);
    return body;
  }

  it("enforces unique labels and stays unverified when the connector is offline", async () => {
    const postgres = await getSharedTestPostgres();
    await postgres.db
      .update(workspaceConnectors)
      .set({ lastHeartbeatAt: null, status: "offline" });
    const { cookie } = await signIn();
    const label = `unique-${crypto.randomUUID().slice(0, 8)}`;
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label,
        serverUrl: "https://offline.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: TEST_MCP_DEFAULT_CREDENTIAL,
      },
    });
    expect(first.statusCode).toBe(201);
    const mcp = first.json() as { id: string; reachabilityStatus: string; reachabilitySummary: string };
    expect(mcp.reachabilityStatus).toBe("unverified");
    expect(mcp.reachabilitySummary.toLowerCase()).toMatch(/connector|offline|unverified|probe/);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label,
        serverUrl: "https://offline-copy.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: TEST_MCP_DEFAULT_CREDENTIAL,
      },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("does not HTTP-GET MCP URLs from the API process and never marks an API-only MCP reachable", async () => {
    const postgres = await getSharedTestPostgres();
    await postgres.db
      .update(workspaceConnectors)
      .set({ lastHeartbeatAt: null, status: "offline" });
    let postCount = 0;
    const handler = createTestMcpHandler({ mode: "tools", tools: ["search"] });
    const server = createServer((request, response) => {
      if (request.method === "POST") {
        postCount += 1;
      }
      void handler(request, response);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const url = `http://127.0.0.1:${port}/mcp`;
    try {
      const { cookie } = await signIn();
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/capabilities/mcp",
        headers: { cookie },
        payload: {
          label: `api-only-${crypto.randomUUID().slice(0, 8)}`,
          serverUrl: url,
          transportType: "http",
          connectionOrigin: "environment",
          allowedTools: ["search"],
          required: true,
          credential: TEST_MCP_DEFAULT_CREDENTIAL,
        },
      });
      expect(created.statusCode).toBe(201);
      await app.inject({
        method: "POST",
        url: `/api/v1/capabilities/mcp/${(created.json() as { id: string }).id}/validate`,
        headers: { cookie },
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(postCount).toBe(0);
      const mcp = created.json() as { reachabilityStatus: string };
      expect(mcp.reachabilityStatus).not.toBe("reachable");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("maps handshake-ok/no-allowed-tools to unreachable and keeps the row", async () => {
    const mcp = await startTestMcpServer({ mode: "none" });
    try {
      const { cookie } = await signIn();
      const connector = await registerConnector();
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/capabilities/mcp",
        headers: { cookie },
        payload: {
          label: `no-tools-${crypto.randomUUID().slice(0, 8)}`,
          serverUrl: mcp.url,
          transportType: "http",
          connectionOrigin: "environment",
          allowedTools: ["search"],
          required: true,
          credential: TEST_MCP_DEFAULT_CREDENTIAL,
        },
      });
      expect(created.statusCode).toBe(201);
      const id = (created.json() as { id: string }).id;
      const next = await app.inject({
        method: "GET",
        url: `/api/v1/connectors/${connector.connectorId}/checks/next?waitSeconds=0`,
        headers: { authorization: `Bearer ${connector.token}` },
      });
      expect(next.statusCode).toBe(200);
      const check = next.json() as { checkId: string; credential?: string };
      expect(check.credential).toBe(TEST_MCP_DEFAULT_CREDENTIAL);
      const reported = await app.inject({
        method: "POST",
        url: `/api/v1/connectors/${connector.connectorId}/checks/${check.checkId}/result`,
        headers: { authorization: `Bearer ${connector.token}` },
        payload: {
          status: "answered",
          reachability: "unreachable",
          handshake: "accepted",
          allowedToolsPresent: false,
          observedAt: new Date().toISOString(),
          errorCode: null,
          message: "None of the allowed tools are advertised.",
        },
      });
      expect(reported.statusCode).toBe(200);
      const fetched = await app.inject({
        method: "GET",
        url: `/api/v1/capabilities/mcp/${id}`,
        headers: { cookie },
      });
      expect(fetched.statusCode).toBe(200);
      const body = fetched.json() as { reachabilityStatus: string; status: string };
      expect(body.reachabilityStatus).toBe("unreachable");
      expect(["invalid", "unreachable", "pending_validation"]).toContain(body.status);
    } finally {
      await mcp.close();
    }
  });

  it("stores unexpected check ids as rejected and does not leak another workspace's MCP", async () => {
    const { cookie, identity } = await signIn();
    const connector = await registerConnector();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label: `owned-${crypto.randomUUID().slice(0, 8)}`,
        serverUrl: "https://owned.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: TEST_MCP_DEFAULT_CREDENTIAL,
      },
    });
    const mcp = created.json() as { id: string };
    const unknownId = crypto.randomUUID();
    await app.inject({
      method: "POST",
      url: `/api/v1/connectors/${connector.connectorId}/checks/${unknownId}/result`,
      headers: { authorization: `Bearer ${connector.token}` },
      payload: {
        status: "answered",
        reachability: "reachable",
        handshake: "accepted",
        allowedToolsPresent: true,
        observedAt: new Date().toISOString(),
      },
    });
    const postgres = await getSharedTestPostgres();
    const [rejected] = await postgres.db
      .select()
      .from(environmentChecks)
      .where(eq(environmentChecks.id, unknownId))
      .limit(1);
    expect(rejected?.status === "rejected" || rejected === undefined).toBe(true);
    if (!rejected) {
      const rows = await postgres.db
        .select()
        .from(environmentChecks)
        .where(eq(environmentChecks.connectorId, connector.connectorId));
      expect(rows.some((row) => row.status === "rejected")).toBe(true);
    }

    const other = await seedOperator(postgres, { email: `other-${crypto.randomUUID()}@adlc.local` });
    const [foreign] = await postgres.db
      .insert(mcpServers)
      .values({
        workspaceId: other.workspaceId,
        label: `foreign-${crypto.randomUUID().slice(0, 8)}`,
        transportType: "http",
        serverUrl: "https://foreign.example.test/mcp",
        connectionOrigin: "environment",
        allowedToolsJson: ["search"],
        required: true,
        createdBy: other.operatorId,
        updatedBy: other.operatorId,
      })
      .returning();

    const leaked = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${foreign.id}?workspaceId=${other.workspaceId}`,
      headers: { cookie },
    });
    expect(leaked.statusCode).toBe(404);
    const listed = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp?workspaceId=${other.workspaceId}`,
      headers: { cookie },
    });
    const ids = (listed.json() as { id: string }[]).map((item) => item.id);
    expect(ids).not.toContain(foreign.id);
    expect(ids).toContain(mcp.id);
    expect(identity.workspaceId).not.toBe(other.workspaceId);
  });
});
