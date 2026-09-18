import { z } from "zod";
import {
  capabilityStatusSchema,
  connectorStatusSchema,
  dateTimeSchema,
  uuidSchema,
} from "./common.js";

export const executorCredentialHealthSchema = z.enum(["healthy", "missing", "invalid"]);
export const workspaceOverallHealthSchema = z.enum(["healthy", "degraded", "unavailable"]);
export const filesystemHealthSchema = z.enum([
  "healthy",
  "unreadable",
  "unwritable",
  "missing",
  "unknown",
]);
export const executorHealthSchema = z.enum(["available", "unavailable", "incompatible", "unknown"]);

export const workspaceEnvironmentSchema = z.object({
  id: uuidSchema,
  type: z.literal("self_hosted"),
  workspacePath: z.string().min(1),
  connectorId: uuidSchema,
  status: capabilityStatusSchema,
  executorCredentialHealth: executorCredentialHealthSchema,
});

export const workspaceHealthSchema = z.object({
  status: workspaceOverallHealthSchema,
  connector: connectorStatusSchema,
  canProbeReachability: z.boolean(),
  filesystem: filesystemHealthSchema.optional(),
  executor: executorHealthSchema.optional(),
  checkedAt: dateTimeSchema,
  issues: z.array(z.string()).default([]),
});

export type WorkspaceEnvironment = z.infer<typeof workspaceEnvironmentSchema>;
export type WorkspaceHealth = z.infer<typeof workspaceHealthSchema>;
