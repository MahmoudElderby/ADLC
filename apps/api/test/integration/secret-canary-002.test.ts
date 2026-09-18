import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

const canary = `canary-mcp-secret-${crypto.randomUUID()}`;

describe("002 secret canary", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  it("never returns the MCP credential on browser-visible 002 APIs", async () => {
    const signedIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    const cookie = cookieHeader(signedIn.headers["set-cookie"])!;
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label: `canary-${crypto.randomUUID().slice(0, 8)}`,
        serverUrl: "https://canary.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: canary,
      },
    });
    expect(created.statusCode).toBe(201);
    const mcp = created.json() as { id: string; updatedAt: string };

    const draft = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp/draft:validate",
      headers: { cookie },
      payload: {
        label: "preview",
        serverUrl: "https://canary.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: canary,
      },
    });
    const listed = await app.inject({ method: "GET", url: "/api/v1/capabilities/mcp", headers: { cookie } });
    const fetched = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
    });
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/capabilities/mcp/${mcp.id}`,
      headers: { cookie },
      payload: {
        label: (created.json() as { label: string }).label,
        serverUrl: "https://canary.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        updatedAt: mcp.updatedAt,
      },
    });
    const audit = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/mcp/${mcp.id}/audit`,
      headers: { cookie },
    });
    const health = await app.inject({
      method: "GET",
      url: "/api/v1/workspace-environment/health",
      headers: { cookie },
    });
    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });

    for (const response of [created, draft, listed, fetched, patched, audit, health, me]) {
      expect(JSON.stringify(response.json())).not.toContain(canary);
    }
  });
});
