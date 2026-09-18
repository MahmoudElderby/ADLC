import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { mcpServers, workspaceSecrets } from "@adlc/database";
import { eq } from "drizzle-orm";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  getSharedTestPostgres,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

const secretValue = `plaintext-mcp-secret-${crypto.randomUUID()}`;

describe("MCP secret at rest", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  it("stores the MCP credential encrypted and never in the HTTP body", async () => {
    const signedIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    const cookie = cookieHeader(signedIn.headers["set-cookie"]);
    expect(cookie).toBeDefined();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/mcp",
      headers: { cookie },
      payload: {
        label: `secret-mcp-${crypto.randomUUID().slice(0, 8)}`,
        serverUrl: "https://secret.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["search"],
        required: true,
        credential: secretValue,
      },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { id: string; credentialSecretId: string | null };
    expect(JSON.stringify(body)).not.toContain(secretValue);
    expect(body.credentialSecretId).toBeTruthy();

    const postgres = await getSharedTestPostgres();
    const [secret] = await postgres.db
      .select()
      .from(workspaceSecrets)
      .where(eq(workspaceSecrets.id, body.credentialSecretId!))
      .limit(1);
    expect(secret).toBeDefined();
    expect(secret.type).toBe("mcp_credential");
    expect(secret.encryptedValue).not.toContain(secretValue);
    expect(secret.encryptedValue.length).toBeGreaterThan(32);
    expect(secret.fingerprint.length).toBeGreaterThan(0);

    const [row] = await postgres.db.select().from(mcpServers).where(eq(mcpServers.id, body.id));
    expect(row.credentialSecretId).toBe(secret.id);
  });
});
