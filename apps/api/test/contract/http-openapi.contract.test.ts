import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { skillSchema } from "@adlc/contracts";
import { createReadyAgentFixture } from "../integration/support/us2-fixtures.js";

describe("HTTP OpenAPI capability and session routes", () => {
  it("registers a skill over HTTP without returning credential values", async () => {
    const { capabilityRegistryService, workspaceId, actorId } = await createReadyAgentFixture();
    const app = Fastify();
    app.post("/api/v1/capabilities/skills", async (request, reply) => {
      const skill = await capabilityRegistryService.registerSkill(
        String(request.headers["x-adlc-workspace-id"]),
        String(request.headers["x-adlc-actor-id"]),
        request.body as Parameters<typeof capabilityRegistryService.registerSkill>[2],
      );
      return reply.send(skill);
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/capabilities/skills",
      headers: {
        "x-adlc-workspace-id": workspaceId,
        "x-adlc-actor-id": actorId,
      },
      payload: {
        name: "http-planning",
        description: "Planning skill",
        sourceType: "source_reference",
        sourceReference: "skills/http-planning",
        version: "1.0.0",
        capabilityDirectories: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = skillSchema.parse(response.json());
    expect(body.name).toBe("http-planning");
    expect(JSON.stringify(body)).not.toMatch(/sk-|bearer /i);
    await app.close();
  });
});
