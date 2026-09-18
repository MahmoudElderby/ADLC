import { describe, expect, it } from "vitest";
import {
  mcpServerSchema,
  problemDetailsSchema,
  registerMcpRequestSchema,
  skillSchema,
} from "@adlc/contracts";

describe("capability registry contracts", () => {
  it("accepts valid skill responses", () => {
    expect(() =>
      skillSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        name: "planning",
        description: "Planning skill",
        sourceType: "source_reference",
        sourceReference: "skills/planning",
        version: "1.0.0",
        capabilityDirectories: [],
        status: "valid",
        validationSummary: "ok",
        validatedAt: "2026-09-18T00:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("fixes MCP transport and origin to workspace HTTP with nonempty tools", () => {
    expect(() =>
      registerMcpRequestSchema.parse({
        label: "devops",
        serverUrl: "https://devops.example.test/mcp",
        transportType: "stdio",
        connectionOrigin: "service",
        allowedTools: [],
        required: true,
      }),
    ).toThrow();

    expect(
      mcpServerSchema.parse({
        id: "00000000-0000-4000-8000-000000000002",
        label: "devops",
        serverUrl: "https://devops.example.test/mcp",
        transportType: "http",
        connectionOrigin: "environment",
        allowedTools: ["create_work_item"],
        required: true,
        credentialSecretId: "00000000-0000-4000-8000-000000000003",
        credentialHealth: "healthy",
        status: "valid",
        validationSummary: "reachable",
        validatedAt: "2026-09-18T00:00:00.000Z",
      }).credentialSecretId,
    ).toBe("00000000-0000-4000-8000-000000000003");
  });

  it("uses RFC 7807 problem details for failures", () => {
    expect(() =>
      problemDetailsSchema.parse({
        type: "about:blank",
        title: "Validation failed",
        status: 422,
        detail: "allowedTools is required",
        correlationId: "00000000-0000-4000-8000-000000000004",
      }),
    ).not.toThrow();
  });
});
