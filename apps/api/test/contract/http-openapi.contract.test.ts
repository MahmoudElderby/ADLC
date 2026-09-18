import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { currentIdentitySchema, problemDetailsSchema } from "@adlc/contracts";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
} from "@adlc/test-support";
import {
  assertNoWorkspaceDisclosure,
  closeNestHttpApp,
  cookieHeader,
  createNestHttpApp,
} from "../support/nest-http-app.js";

describe("HTTP OpenAPI auth and public routes", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  it("allows unauthenticated GET /health", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: "adlc-api", status: "ok" });
  });

  it("signs in with 204 Set-Cookie and rejects unknown credentials without disclosing the email", async () => {
    const unknown = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: "nobody@example.test", password: "wrong-password" },
    });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.headers["content-type"]).toMatch(/application\/problem\+json/);
    const unknownBody = problemDetailsSchema.parse(unknown.json());
    expect(unknownBody.detail.toLowerCase()).not.toContain("exist");
    expect(unknownBody.detail.toLowerCase()).not.toContain("nobody@example.test");
    assertNoWorkspaceDisclosure(unknownBody);

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: "not-the-operator-password" },
    });
    expect(wrongPassword.statusCode).toBe(401);
    const wrongBody = problemDetailsSchema.parse(wrongPassword.json());
    expect(wrongBody.title).toBe(unknownBody.title);
    expect(wrongBody.detail).toBe(unknownBody.detail);
    expect(wrongBody.status).toBe(unknownBody.status);
    expect(wrongBody.type).toBe(unknownBody.type);
    assertNoWorkspaceDisclosure(wrongBody);

    const signedIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    expect(signedIn.statusCode).toBe(204);
    expect(signedIn.body).toBe("");
    const cookie = cookieHeader(signedIn.headers["set-cookie"]);
    expect(cookie).toMatch(/^adlc_session=/);
    expect(signedIn.headers["set-cookie"]?.toString().toLowerCase()).toContain("httponly");
    expect(signedIn.headers["set-cookie"]?.toString().toLowerCase()).toContain("samesite=lax");
  });

  it("returns current identity, signs out, and refuses skills without a cookie", async () => {
    const signedIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    const cookie = cookieHeader(signedIn.headers["set-cookie"]);
    expect(cookie).toBeDefined();

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    const identity = currentIdentitySchema.parse(me.json());
    expect(identity.email).toBe(DEFAULT_OPERATOR_EMAIL);
    expect(identity.displayName.length).toBeGreaterThan(0);
    expect(identity.workspaceName.length).toBeGreaterThan(0);

    const unauthenticatedSkills = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/skills",
    });
    expect(unauthenticatedSkills.statusCode).toBe(401);
    expect(unauthenticatedSkills.headers["content-type"]).toMatch(/application\/problem\+json/);
    const problem = problemDetailsSchema.parse(unauthenticatedSkills.json());
    expect(unauthenticatedSkills.json()).not.toHaveProperty("length");
    expect(Array.isArray(unauthenticatedSkills.json())).toBe(false);
    assertNoWorkspaceDisclosure(problem);

    const signedOut = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-out",
      headers: { cookie },
    });
    expect(signedOut.statusCode).toBe(204);

    const afterSignOut = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    expect(afterSignOut.statusCode).toBe(401);
  });

  it("rejects connector routes without a bearer token", async () => {
    const connectorId = "00000000-0000-4000-8000-00000000e002";
    const getNext = await app.inject({
      method: "GET",
      url: `/api/v1/connectors/${connectorId}/commands/next`,
    });
    expect(getNext.statusCode).toBe(401);
    expect(getNext.headers["content-type"]).toMatch(/application\/problem\+json/);
    problemDetailsSchema.parse(getNext.json());
    assertNoWorkspaceDisclosure(getNext.json());

    const heartbeat = await app.inject({
      method: "POST",
      url: `/api/v1/connectors/${connectorId}/heartbeat`,
      payload: { connectorVersion: "0.1.0", observedAt: new Date().toISOString() },
    });
    expect(heartbeat.statusCode).toBe(401);
    problemDetailsSchema.parse(heartbeat.json());
    assertNoWorkspaceDisclosure(heartbeat.json());
  });
});
