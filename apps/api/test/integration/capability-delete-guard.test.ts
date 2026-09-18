import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { mcpServers } from "@adlc/database";
import { eq } from "drizzle-orm";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  attachCapabilityToSeededAgent,
  getSharedTestPostgres,
  seedPublishedAgentWithoutAttachment,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

describe("capability delete guard", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  it("seeds a published agent with no attachment, then blocks delete after attach", async () => {
    const signedIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    const cookie = cookieHeader(signedIn.headers["set-cookie"])!;
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    const identity = me.json() as { userId: string; workspaceId: string };
    const postgres = await getSharedTestPostgres();
    const agent = await seedPublishedAgentWithoutAttachment(postgres, {
      workspaceId: identity.workspaceId,
      createdBy: identity.userId,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label: `guard-${crypto.randomUUID().slice(0, 8)}`,
        serverUrl: "https://guard.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: "guard-credential",
      },
    });
    expect(created.statusCode).toBe(201);
    const mcp = created.json() as { id: string };

    const free = await app.inject({
      method: "DELETE",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    expect(free.statusCode).toBe(204);

    const createdAgain = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label: `guard-attached-${crypto.randomUUID().slice(0, 8)}`,
        serverUrl: "https://guard-attached.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: "guard-credential",
      },
    });
    const attachedMcp = createdAgain.json() as { id: string };
    await attachCapabilityToSeededAgent(postgres, {
      agentId: agent.agentId,
      capabilityType: "mcp_server",
      capabilityId: attachedMcp.id,
    });

    const blocked = await app.inject({
      method: "DELETE",
      url: `/api/v1/capabilities/mcp/${attachedMcp.id}`,
      headers: { cookie },
    });
    expect(blocked.statusCode).toBe(409);
    const body = blocked.json() as { referencingAgents?: { id: string; name: string }[] };
    expect(body.referencingAgents?.some((item) => item.id === agent.agentId)).toBe(true);
    expect(body.referencingAgents?.some((item) => item.name === agent.name)).toBe(true);

    const [row] = await postgres.db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.id, attachedMcp.id))
      .limit(1);
    expect(row).toBeDefined();
  });
});
