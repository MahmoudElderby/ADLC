import { z } from "zod";
import { capabilityStatusSchema, dateTimeSchema, uuidSchema } from "./common.js";

export const skillSourceTypeSchema = z.enum(["openai_skill_id", "source_reference"]);

export const registerSkillRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  sourceType: skillSourceTypeSchema,
  sourceReference: z.string().min(1),
  version: z.string().min(1).max(80),
  capabilityDirectories: z.array(z.string()).default([]),
});

export const skillSchema = registerSkillRequestSchema.extend({
  id: uuidSchema,
  status: capabilityStatusSchema,
  validationSummary: z.string().nullable().default(null),
  validatedAt: dateTimeSchema.nullable().default(null),
});

export const registerMcpRequestSchema = z.object({
  label: z.string().min(1).max(80),
  serverUrl: z.string().url(),
  transportType: z.literal("http").default("http"),
  connectionOrigin: z.literal("environment").default("environment"),
  allowedTools: z.array(z.string().min(1)).min(1),
  required: z.boolean().default(true),
  credentialSecretId: uuidSchema.nullable().default(null),
});

export const credentialHealthSchema = z.enum(["not_required", "healthy", "missing", "invalid"]);

export const mcpServerSchema = registerMcpRequestSchema.extend({
  id: uuidSchema,
  status: capabilityStatusSchema,
  credentialHealth: credentialHealthSchema,
  validationSummary: z.string().nullable().default(null),
  validatedAt: dateTimeSchema.nullable().default(null),
});

export type RegisterSkillRequest = z.infer<typeof registerSkillRequestSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type RegisterMcpRequest = z.infer<typeof registerMcpRequestSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;
