import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { auditLog, skills } from "@adlc/database";
import { eq } from "drizzle-orm";
import {
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
  getSharedTestPostgres,
  seedOperator,
  startApiProcess,
  type ApiProcessHandle,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

function skillPayload(overrides: Record<string, unknown> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return {
    name: `persist-skill-${suffix}`,
    description: "Persisted skill.",
    sourceType: "source_reference",
    sourceReference: `skills/persist-${suffix}`,
    version: "1.0.0",
    capabilityDirectories: [],
    compatibleEnvironmentTypes: ["self_hosted"],
    ...overrides,
  };
}

describe("skill persistence and append-only audit", () => {
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
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie },
    });
    return { cookie: cookie!, identity: me.json() as { userId: string; workspaceId: string } };
  }

  it("enforces unique name and version in the workspace", async () => {
    const { cookie } = await signIn();
    const payload = skillPayload();
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(first.statusCode).toBe(201);
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("stores created_by and updated_by from the session, not spoofed headers", async () => {
    const { cookie, identity } = await signIn();
    const payload = skillPayload();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: {
        cookie,
        "x-adlc-workspace-id": "00000000-0000-4000-8000-00000000aaaa",
        "x-adlc-actor-id": "00000000-0000-4000-8000-00000000bbbb",
      },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { id: string };
    const postgres = await getSharedTestPostgres();
    const [row] = await postgres.db.select().from(skills).where(eq(skills.id, body.id)).limit(1);
    expect(row.createdBy).toBe(identity.userId);
    expect(row.updatedBy).toBe(identity.userId);
    expect(row.createdBy).not.toBe("00000000-0000-4000-8000-00000000bbbb");
    expect(row.workspaceId).toBe(identity.workspaceId);
  });

  it("refuses persistence when compatible environments omit self_hosted", async () => {
    const { cookie } = await signIn();
    const payload = skillPayload({
      name: `no-self-host-${crypto.randomUUID().slice(0, 8)}`,
      compatibleEnvironmentTypes: ["cloud"],
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(created.statusCode).toBe(422);
    const postgres = await getSharedTestPostgres();
    const rows = await postgres.db.select().from(skills).where(eq(skills.name, payload.name as string));
    expect(rows).toHaveLength(0);
  });

  it("rejects UPDATE and DELETE against audit_log with append-only", async () => {
    const { cookie } = await signIn();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload: skillPayload(),
    });
    expect(created.statusCode).toBe(201);
    const skill = created.json() as { id: string };
    const postgres = await getSharedTestPostgres();
    const [audit] = await postgres.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, skill.id))
      .limit(1);
    expect(audit).toBeDefined();

    await expect(
      postgres.query("UPDATE audit_log SET action = $1 WHERE id = $2", ["tampered", audit.id]),
    ).rejects.toThrow(/audit_log is append-only/);
    await expect(postgres.query("DELETE FROM audit_log WHERE id = $1", [audit.id])).rejects.toThrow(
      /audit_log is append-only/,
    );
  });

  it(
    "keeps the skill and audits after killing and restarting the OS API process",
    async () => {
      const postgres = await getSharedTestPostgres();
      let api: ApiProcessHandle | undefined;
      try {
        api = await startApiProcess({ databaseUrl: postgres.connectionString });
        const signedIn = await fetch(`${api.baseUrl}/api/v1/auth/sign-in`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: DEFAULT_OPERATOR_EMAIL,
            password: DEFAULT_OPERATOR_PASSWORD,
          }),
        });
        expect(signedIn.status).toBe(204);
        const cookie = signedIn.headers.getSetCookie?.()[0]?.split(";")[0];
        expect(cookie).toMatch(/^adlc_session=/);

        const payload = skillPayload({ name: `restart-skill-${crypto.randomUUID().slice(0, 8)}` });
        const created = await fetch(`${api.baseUrl}/api/v1/capabilities/skills`, {
          method: "POST",
          headers: { cookie: cookie!, "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(created.status).toBe(201);
        const skill = (await created.json()) as { id: string; name: string };

        api = await api.restart();

        const fetched = await fetch(`${api.baseUrl}/api/v1/capabilities/skills/${skill.id}`, {
          headers: { cookie: cookie! },
        });
        expect(fetched.status).toBe(200);
        expect((await fetched.json()) as { name: string }).toMatchObject({ name: skill.name });

        const history = await fetch(`${api.baseUrl}/api/v1/capabilities/skills/${skill.id}/audit`, {
          headers: { cookie: cookie! },
        });
        expect(history.status).toBe(200);
        const audits = (await history.json()) as { action: string }[];
        expect(audits.some((entry) => entry.action === "skill.registered")).toBe(true);
      } finally {
        await api?.stop();
      }
    },
    90_000,
  );

  it("cannot read or mutate a skill from another workspace id in body or query", async () => {
    const postgres = await getSharedTestPostgres();
    const other = await seedOperator(postgres, {
      email: `other-${crypto.randomUUID()}@adlc.local`,
    });
    const [foreign] = await postgres.db
      .insert(skills)
      .values({
        workspaceId: other.workspaceId,
        name: `foreign-${crypto.randomUUID().slice(0, 8)}`,
        description: "Other workspace skill",
        sourceType: "source_reference",
        sourceReference: "skills/foreign",
        version: "1.0.0",
        createdBy: other.operatorId,
        updatedBy: other.operatorId,
      })
      .returning();

    const { cookie, identity } = await signIn();
    const ownPayload = skillPayload();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload: ownPayload,
    });
    expect(created.statusCode).toBe(201);
    const own = created.json() as { id: string; updatedAt: string; name: string };

    const leaked = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/skills/${foreign.id}?workspaceId=${other.workspaceId}`,
      headers: { cookie },
    });
    expect(leaked.statusCode).toBe(404);

    const listed = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/skills?workspaceId=${other.workspaceId}`,
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    const ids = (listed.json() as { id: string }[]).map((item) => item.id);
    expect(ids).not.toContain(foreign.id);
    expect(ids).toContain(own.id);

    const hijackName = `hijacked-${crypto.randomUUID().slice(0, 8)}`;
    const hijack = await app.inject({
      method: "PATCH",
      url: `/api/v1/capabilities/skills/${own.id}`,
      headers: { cookie },
      payload: {
        ...ownPayload,
        name: hijackName,
        workspaceId: other.workspaceId,
        updatedAt: own.updatedAt,
      },
    });
    expect(hijack.statusCode).toBe(200);
    const [ownRow] = await postgres.db.select().from(skills).where(eq(skills.id, own.id)).limit(1);
    expect(ownRow.workspaceId).toBe(identity.workspaceId);
    expect(ownRow.name).toBe(hijackName);
    const [foreignRow] = await postgres.db
      .select()
      .from(skills)
      .where(eq(skills.id, foreign.id))
      .limit(1);
    expect(foreignRow.name).toBe(foreign.name);
    expect(foreignRow.workspaceId).toBe(other.workspaceId);
  });
});
