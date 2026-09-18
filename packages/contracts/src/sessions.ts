import { z } from "zod";
import { dateTimeSchema, uuidSchema } from "./common.js";

export const sessionStatusSchema = z.enum([
  "creating",
  "provisioning",
  "running",
  "completed",
  "failed",
  "canceled",
  "interrupted",
]);

export const terminalSessionStatusSchema = z.enum([
  "completed",
  "failed",
  "canceled",
  "interrupted",
]);

export const executorStatusSchema = z.enum([
  "not_requested",
  "requested",
  "connecting",
  "connected",
  "stopped",
  "failed",
]);

export const sessionStartRequestSchema = z.object({
  agentId: uuidSchema,
  input: z.string().min(1).max(50_000),
});

export const redactedSnapshotSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
  })
  .catchall(z.unknown());

export const sessionSchema = z.object({
  id: uuidSchema,
  agentId: uuidSchema,
  agentVersionId: uuidSchema,
  status: sessionStatusSchema,
  executorStatus: executorStatusSchema,
  input: z.string(),
  snapshotSummary: redactedSnapshotSchema.optional(),
  createdAt: dateTimeSchema,
  startedAt: dateTimeSchema.nullable().default(null),
  terminalAt: dateTimeSchema.nullable().default(null),
  failureSummary: z.string().nullable().default(null),
});

export const cancelSessionResponseSchema = sessionSchema.extend({
  status: z.literal("canceled"),
});

export const normalizedSessionEventSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  sequence: z.number().int().positive(),
  category: z.enum(["lifecycle", "output", "tool", "artifact", "error"]),
  type: z.string().min(1),
  actorType: z.enum(["user", "agent", "mcp", "environment", "system"]),
  actorId: z.string().nullable(),
  summary: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  occurredAt: dateTimeSchema,
});

export const sseEnvelopeSchema = z.object({
  sessionId: uuidSchema,
  sequence: z.number().int().positive(),
  occurredAt: dateTimeSchema,
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const artifactStatusSchema = z.enum([
  "valid",
  "missing",
  "unreadable",
  "outside_workspace",
  "invalid_type",
]);

export const artifactSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  reportSequence: z.number().int().positive(),
  name: z.string().min(1),
  type: z.literal("markdown"),
  workspaceRelativePath: z.string().min(1),
  status: artifactStatusSchema,
  producerAgentId: uuidSchema.optional(),
  reportedAt: dateTimeSchema,
  validatedAt: dateTimeSchema.nullable().default(null),
});

export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type ExecutorStatus = z.infer<typeof executorStatusSchema>;
export type SessionStartRequest = z.infer<typeof sessionStartRequestSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type NormalizedSessionEvent = z.infer<typeof normalizedSessionEventSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
