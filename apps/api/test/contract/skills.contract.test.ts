import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  auditResponseSchema,
  draftValidationSchema,
  problemDetailsSchema,
  skillSchema,
} from "@adlc/contracts";
import {
  DEFAULT_OPERATOR_DISPLAY_NAME,
  DEFAULT_OPERATOR_EMAIL,
  DEFAULT_OPERATOR_PASSWORD,
} from "@adlc/test-support";
import { closeNestHttpApp, cookieHeader, createNestHttpApp } from "../support/nest-http-app.js";

function skillPayload(overrides: Record<string, unknown> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return {
    name: `contract-skill-${suffix}`,
    description: "A referenced skill for contract tests.",
    sourceType: "source_reference",
    sourceReference: `skills/contract-${suffix}`,
    version: "1.0.0",
    capabilityDirectories: ["skills/contract"],
    compatibleEnvironmentTypes: ["self_hosted"],
    ...overrides,
  };
}

describe("skill HTTP contracts", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createNestHttpApp();
  });

  afterAll(async () => {
    await closeNestHttpApp(app);
  });

  async function signIn(): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: DEFAULT_OPERATOR_EMAIL, password: DEFAULT_OPERATOR_PASSWORD },
    });
    expect(response.statusCode).toBe(204);
    const cookie = cookieHeader(response.headers["set-cookie"]);
    expect(cookie).toBeDefined();
    return cookie!;
  }

  it("lists, registers, gets, patches, and deletes a skill", async () => {
    const cookie = await signIn();
    const payload = skillPayload();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const skill = skillSchema.parse(created.json());
    expect(skill.name).toBe(payload.name);
    expect(skill.createdBy.displayName).toBe(DEFAULT_OPERATOR_DISPLAY_NAME);
    expect(skill.lastChangedBy.displayName).toBe(DEFAULT_OPERATOR_DISPLAY_NAME);

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    const names = (listed.json() as { name: string }[]).map((item) => item.name);
    expect(names).toContain(payload.name);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/skills/${skill.id}`,
      headers: { cookie },
    });
    expect(fetched.statusCode).toBe(200);
    expect(skillSchema.parse(fetched.json()).id).toBe(skill.id);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/capabilities/skills/${skill.id}`,
      headers: { cookie },
      payload: {
        ...payload,
        description: "Updated description.",
        updatedAt: skill.updatedAt,
      },
    });
    expect(patched.statusCode).toBe(200);
    const updated = skillSchema.parse(patched.json());
    expect(updated.description).toBe("Updated description.");
    expect(updated.updatedAt).not.toBe(skill.updatedAt);

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/v1/capabilities/skills/${skill.id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(204);

    const missing = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/skills/${skill.id}`,
      headers: { cookie },
    });
    expect(missing.statusCode).toBe(404);
    problemDetailsSchema.parse(missing.json());
  });

  it("validates drafts without creating a row and returns blocking vs warning issues", async () => {
    const cookie = await signIn();
    const before = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
    });
    const beforeCount = (before.json() as unknown[]).length;

    const emptyName = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills/draft:validate",
      headers: { cookie },
      payload: skillPayload({ name: "", capabilityDirectories: [] }),
    });
    expect(emptyName.statusCode).toBe(200);
    const emptyResult = draftValidationSchema.parse(emptyName.json());
    expect(emptyResult.blockingErrors.some((issue) => issue.field === "name")).toBe(true);
    expect(emptyResult.warnings.some((issue) => issue.field === "capabilityDirectories")).toBe(true);
    expect(emptyResult.preview).toMatchObject({ sourceType: "source_reference" });

    const noSelfHosted = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills/draft:validate",
      headers: { cookie },
      payload: skillPayload({ compatibleEnvironmentTypes: ["cloud"] }),
    });
    expect(noSelfHosted.statusCode).toBe(200);
    const blockedEnv = draftValidationSchema.parse(noSelfHosted.json());
    expect(
      blockedEnv.blockingErrors.some((issue) => issue.field === "compatibleEnvironmentTypes"),
    ).toBe(true);

    const valid = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills/draft:validate",
      headers: { cookie },
      payload: skillPayload({ name: "preview-skill" }),
    });
    expect(valid.statusCode).toBe(200);
    const validResult = draftValidationSchema.parse(valid.json());
    expect(validResult.blockingErrors).toEqual([]);
    expect(validResult.preview).toMatchObject({ name: "preview-skill" });

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
    });
    expect((after.json() as unknown[]).length).toBe(beforeCount);
  });

  it("returns skill audit entries with actor id and displayName", async () => {
    const cookie = await signIn();
    const payload = skillPayload();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const skill = skillSchema.parse(created.json());

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/capabilities/skills/${skill.id}/audit`,
      headers: { cookie },
    });
    expect(history.statusCode).toBe(200);
    const audits = auditResponseSchema.parse(history.json());
    expect(audits.some((entry) => entry.action === "skill.registered")).toBe(true);
    for (const entry of audits) {
      expect(entry.actor.displayName).toBe(DEFAULT_OPERATOR_DISPLAY_NAME);
      expect(entry.actor.id).toBe(skill.createdBy.id);
      expect(entry.actor.displayName).not.toBe(entry.actor.id);
    }
  });

  it("returns 422 with field errors for empty required fields and missing self_hosted", async () => {
    const cookie = await signIn();
    const emptyName = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload: skillPayload({ name: "" }),
    });
    expect(emptyName.statusCode).toBe(422);
    expect(emptyName.headers["content-type"]).toMatch(/application\/problem\+json/);
    const emptyBody = problemDetailsSchema.parse(emptyName.json());
    expect(emptyBody.errors?.some((error) => error.field === "name")).toBe(true);

    const noSelfHosted = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload: skillPayload({ compatibleEnvironmentTypes: ["cloud"] }),
    });
    expect(noSelfHosted.statusCode).toBe(422);
    const envBody = problemDetailsSchema.parse(noSelfHosted.json());
    expect(envBody.errors?.some((error) => error.field === "compatibleEnvironmentTypes")).toBe(true);
  });

  it("returns 409 for duplicate name+version and stale updatedAt", async () => {
    const cookie = await signIn();
    const payload = skillPayload();
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(first.statusCode).toBe(201);
    const skill = skillSchema.parse(first.json());

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: { cookie },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
    problemDetailsSchema.parse(duplicate.json());

    const stale = await app.inject({
      method: "PATCH",
      url: `/api/v1/capabilities/skills/${skill.id}`,
      headers: { cookie },
      payload: {
        ...payload,
        description: "Should not overwrite.",
        updatedAt: "2000-01-01T00:00:00.000Z",
      },
    });
    expect(stale.statusCode).toBe(409);
    problemDetailsSchema.parse(stale.json());
  });
});
