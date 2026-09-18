import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  auditResponseSchema,
  draftValidationSchema,
  mcpServerSchema,
  problemDetailsSchema,
} from "@adlc/contracts";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  attachCapabilityToSeededAgent,
  getSharedTestPostgres,
  seedPublishedAgentWithoutAttachment,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

const registrationToken =
  process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "replace-with-registration-secret-min-24";

function mcpPayload(overrides: Record<string, unknown> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return {
    label: `mcp-${suffix}`,
    serverUrl: `https://mcp-${suffix}.example.test/mcp`,
    transportType: "http",
    connectionOrigin: "environment",
    allowedTools: ["search"],
    required: true,
    credential: "mcp-credential-value",
    ...overrides,
  };
}

describe("MCP and connector HTTP contracts", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  async function signIn(): Promise<{ cookie: string; userId: string; workspaceId: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    expect(response.statusCode).toBe(204);
    const cookie = cookieHeader(response.headers["set-cookie"]);
    expect(cookie).toBeDefined();
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    const identity = me.json() as { userId: string; workspaceId: string };
    return { cookie: cookie!, userId: identity.userId, workspaceId: identity.workspaceId };
  }

  it("lists, registers, gets, patches, and deletes an MCP without returning the credential", async () => {
    const { cookie } = await signIn();
    const payload = mcpPayload();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const mcp = mcpServerSchema.parse(created.json());
    expect(JSON.stringify(created.json())).not.toContain(payload.credential);
    expect(mcp.credentialSecretId).toBeTruthy();

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    expect((listed.json() as { id: string }[]).some((item) => item.id === mcp.id)).toBe(true);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    expect(fetched.statusCode).toBe(200);
    const roundTrip = mcpServerSchema.parse(fetched.json());
    expect(JSON.stringify(fetched.json())).not.toContain(payload.credential);
    expect(roundTrip.credentialSecretId).toBe(mcp.credentialSecretId);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
      payload: {
        ...payload,
        credential: undefined,
        allowedTools: ["search", "fetch"],
        updatedAt: mcp.updatedAt,
      },
    });
    expect(patched.statusCode).toBe(200);
    expect(mcpServerSchema.parse(patched.json()).allowedTools).toContain("fetch");
    expect(JSON.stringify(patched.json())).not.toContain("mcp-credential-value");

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(204);
  });

  it("validates MCP drafts without probing the network or creating a row", async () => {
    const { cookie } = await signIn();
    const before = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
    });
    const beforeCount = (before.json() as unknown[]).length;

    const emptyLabel = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp/draft:validate",
      headers: { cookie },
      payload: mcpPayload({ label: "", allowedTools: [] }),
    });
    expect(emptyLabel.statusCode).toBe(200);
    const draft = draftValidationSchema.parse(emptyLabel.json());
    expect(draft.blockingErrors.some((issue) => issue.field === "label")).toBe(true);
    expect(JSON.stringify(draft.preview)).not.toContain("mcp-credential-value");

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
    });
    expect((after.json() as unknown[]).length).toBe(beforeCount);
  });

  it("returns MCP audit entries and 409 for duplicate labels", async () => {
    const { cookie } = await signIn();
    const payload = mcpPayload();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const mcp = mcpServerSchema.parse(created.json());

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${mcp.id}/audit`,
      headers: { cookie },
    });
    expect(history.statusCode).toBe(200);
    const audits = auditResponseSchema.parse(history.json());
    expect(audits.some((entry) => entry.action === "mcp.registered")).toBe(true);
    expect(JSON.stringify(audits)).not.toContain(payload.credential);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
    problemDetailsSchema.parse(duplicate.json());
  });

  it("refuses delete with 409 referencingAgents when a seeded agent is attached", async () => {
    const { cookie, userId, workspaceId } = await signIn();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: mcpPayload(),
    });
    expect(created.statusCode).toBe(201);
    const mcp = mcpServerSchema.parse(created.json());
    const postgres = await getSharedTestPostgres();
    const agent = await seedPublishedAgentWithoutAttachment(postgres, {
      workspaceId,
      createdBy: userId,
    });
    await attachCapabilityToSeededAgent(postgres, {
      agentId: agent.agentId,
      capabilityType: "mcp_server",
      capabilityId: mcp.id,
    });

    const blocked = await app.inject({
      method: "DELETE",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    expect(blocked.statusCode).toBe(409);
    const problem = problemDetailsSchema.parse(blocked.json());
    const agents = (blocked.json() as { referencingAgents?: { id: string; name: string }[] })
      .referencingAgents;
    expect(agents?.some((item) => item.id === agent.agentId)).toBe(true);
    expect(problem.status).toBe(409);

    const stillThere = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    expect(stillThere.statusCode).toBe(200);
  });

  it("registers a connector, accepts heartbeat, and serves checks/next without executable payload", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/v1/connectors/register",
      headers: { authorization: `Bearer ${registrationToken}` },
      payload: {
        name: "workspace-connector",
        hostFingerprint: "test-host",
        connectorVersion: "0.2.0",
        workspacePath: "C:/tmp/adlc-workspace",
      },
    });
    expect(registered.statusCode).toBe(201);
    const body = registered.json() as { connectorId: string; token: string; workspaceId: string };
    expect(body.connectorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.token.length).toBeGreaterThan(16);
    expect(JSON.stringify(body)).not.toContain(registrationToken);

    const heartbeat = await app.inject({
      method: "POST",
      url: `/api/v1/connectors/${body.connectorId}/heartbeat`,
      headers: { authorization: `Bearer ${body.token}` },
      payload: {
        connectorVersion: "0.2.0",
        hostFingerprint: "test-host",
        observedAt: new Date().toISOString(),
      },
    });
    expect(heartbeat.statusCode).toBe(200);
    const heartbeatBody = heartbeat.json() as Record<string, unknown>;
    expect(heartbeatBody.ok).toBe(true);
    expect(JSON.stringify(heartbeatBody)).not.toMatch(/start_executor|commands\/next|mcp-credential/);

    const nextCheck = await app.inject({
      method: "GET",
      url: `/api/v1/connectors/${body.connectorId}/checks/next?waitSeconds=0`,
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect([200, 204]).toContain(nextCheck.statusCode);

    const result = await app.inject({
      method: "POST",
      url: `/api/v1/connectors/${body.connectorId}/checks/00000000-0000-4000-8000-00000000c001/result`,
      headers: { authorization: `Bearer ${body.token}` },
      payload: { status: "answered", summary: "unused" },
    });
    expect([200, 404, 409]).toContain(result.statusCode);
  });
});
