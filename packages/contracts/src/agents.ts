import { z } from "zod";
import { dateTimeSchema, uuidSchema } from "./common.js";

export const capabilityAttachmentSchema = z.object({
  type: z.enum(["skill", "mcp_server"]),
  capabilityId: uuidSchema,
  required: z.boolean(),
});

export const createAgentRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  model: z.string().min(1),
  instructions: z.string().min(1),
  approvalMode: z.literal("always_allow"),
  capabilities: z.array(capabilityAttachmentSchema).min(2),
});

export const agentReviewSchema = z.object({
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const agentSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string(),
  status: z.enum(["draft", "published"]),
  openaiAgentId: z.string().nullable(),
  draftVersion: z.number().int().positive(),
  publishedVersion: z.number().int().positive().nullable(),
  approvalMode: z.literal("always_allow"),
  capabilities: z.array(capabilityAttachmentSchema),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
});

export type CapabilityAttachment = z.infer<typeof capabilityAttachmentSchema>;
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>;
export type Agent = z.infer<typeof agentSchema>;
