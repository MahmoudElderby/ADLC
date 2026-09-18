import { z } from "zod";
import { actorSummarySchema } from "./auth.js";
import {
  dateTimeSchema,
  mcpReachabilityStatusSchema,
  skillValidationStatusSchema,
  uuidSchema,
} from "./common.js";

export const skillSourceTypeSchema = z.enum(["openai_skill_id", "source_reference"]);

export const registerSkillRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  sourceType: skillSourceTypeSchema,
  sourceReference: z.string().min(1),
  version: z.string().min(1).max(80),
  capabilityDirectories: z.array(z.string()).optional().default([]),
  compatibleEnvironmentTypes: z.array(z.string()).optional().default(["self_hosted"]),
});

export const updateSkillRequestSchema = registerSkillRequestSchema.extend({
  updatedAt: dateTimeSchema,
});

export const skillSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  sourceType: skillSourceTypeSchema,
  sourceReference: z.string().min(1),
  version: z.string().min(1),
  capabilityDirectories: z.array(z.string()).default([]),
  status: skillValidationStatusSchema,
  validationSummary: z.string().nullable().default(null),
  validatedAt: dateTimeSchema.nullable().default(null),
  createdBy: actorSummarySchema,
  lastChangedBy: actorSummarySchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const registerMcpRequestSchema = z.object({
  label: z.string().min(1).max(80),
  serverUrl: z.string().url(),
  transportType: z.literal("http").default("http"),
  connectionOrigin: z.literal("environment").default("environment"),
  allowedTools: z.array(z.string().min(1)).min(1),
  required: z.boolean().default(true),
  credential: z.string().min(1),
});

export const updateMcpRequestSchema = registerMcpRequestSchema.extend({
  updatedAt: dateTimeSchema,
  credential: z.string().min(1).optional(),
});

export const credentialHealthSchema = z.enum(["not_required", "healthy", "missing", "invalid"]);

export const mcpServerSchema = z.object({
  id: uuidSchema,
  label: z.string().min(1),
  serverUrl: z.string().url(),
  transportType: z.literal("http"),
  connectionOrigin: z.literal("environment"),
  allowedTools: z.array(z.string().min(1)).min(1),
  required: z.boolean(),
  status: skillValidationStatusSchema,
  reachabilityStatus: mcpReachabilityStatusSchema,
  reachabilitySummary: z.string().nullable().default(null),
  credentialSecretId: uuidSchema.nullable(),
  credentialHealth: credentialHealthSchema,
  validationSummary: z.string().nullable().default(null),
  validatedAt: dateTimeSchema.nullable().default(null),
  createdBy: actorSummarySchema,
  lastChangedBy: actorSummarySchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const draftValidationIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const draftValidationSchema = z.object({
  blockingErrors: z.array(draftValidationIssueSchema),
  warnings: z.array(draftValidationIssueSchema),
  preview: z.record(z.string(), z.unknown()),
});

export type RegisterSkillRequest = z.input<typeof registerSkillRequestSchema>;
export type UpdateSkillRequest = z.input<typeof updateSkillRequestSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type RegisterMcpRequest = z.input<typeof registerMcpRequestSchema>;
export type UpdateMcpRequest = z.input<typeof updateMcpRequestSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;
export type DraftValidation = z.infer<typeof draftValidationSchema>;
