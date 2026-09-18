import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { authenticatedSessions } from "@adlc/database";
import { eq } from "drizzle-orm";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  getSharedTestPostgres,
} from "@adlc/test-support";
import { hashSessionToken } from "../../src/platform/auth/session-policy.js";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

describe("operator session PostgreSQL identity", () => {
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
    expect(response.statusCode).toBe(204);
    const cookie = cookieHeader(response.headers["set-cookie"]);
    expect(cookie).toBeDefined();
    const token = cookie!.slice("adlc_session=".length);
    return { cookie: cookie!, token };
  }

  it("ignores spoofed workspace and actor headers", async () => {
    const spoofed = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        "x-adlc-workspace-id": "00000000-0000-4000-8000-00000000aaaa",
        "x-adlc-actor-id": "00000000-0000-4000-8000-00000000bbbb",
      },
    });
    expect(spoofed.statusCode).toBe(401);

    const { cookie } = await signIn();
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        cookie,
        "x-adlc-workspace-id": "00000000-0000-4000-8000-00000000aaaa",
        "x-adlc-actor-id": "00000000-0000-4000-8000-00000000bbbb",
      },
    });
    expect(me.statusCode).toBe(200);
    const body = me.json() as { workspaceId: string; userId: string };
    expect(body.workspaceId).not.toBe("00000000-0000-4000-8000-00000000aaaa");
    expect(body.userId).not.toBe("00000000-0000-4000-8000-00000000bbbb");
  });

  it("refuses idle and absolute expired sessions", async () => {
    const postgres = await getSharedTestPostgres();
    const idle = await signIn();
    await postgres.db
      .update(authenticatedSessions)
      .set({
        lastSeenAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 1000),
      })
      .where(eq(authenticatedSessions.tokenHash, hashSessionToken(idle.token)));

    const idleResponse = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: idle.cookie },
    });
    expect(idleResponse.statusCode).toBe(401);

    const absolute = await signIn();
    await postgres.db
      .update(authenticatedSessions)
      .set({
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() - 60 * 1000),
      })
      .where(eq(authenticatedSessions.tokenHash, hashSessionToken(absolute.token)));

    const absoluteResponse = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/skills",
      headers: { cookie: absolute.cookie },
    });
    expect(absoluteResponse.statusCode).toBe(401);
  });

  it("revokes the session row on sign-out", async () => {
    const postgres = await getSharedTestPostgres();
    const { cookie, token } = await signIn();
    const signedOut = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-out",
      headers: { cookie },
    });
    expect(signedOut.statusCode).toBe(204);

    const [row] = await postgres.db
      .select({ status: authenticatedSessions.status, revokedAt: authenticatedSessions.revokedAt })
      .from(authenticatedSessions)
      .where(eq(authenticatedSessions.tokenHash, hashSessionToken(token)))
      .limit(1);
    expect(row?.status).toBe("revoked");
    expect(row?.revokedAt).toBeTruthy();

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    expect(after.statusCode).toBe(401);
  });
});
