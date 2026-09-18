import { z } from "zod";
import {
  artifactSchema,
  normalizedSessionEventSchema,
  redactedSnapshotSchema,
  sessionSchema,
} from "./sessions.js";
import { uuidSchema, dateTimeSchema, auditOutcomeSchema } from "./common.js";
import { actorSummarySchema } from "./auth.js";

export const auditEntrySchema = z.object({
  id: uuidSchema,
  actor: actorSummarySchema,
  action: z.string(),
  entityType: z.string(),
  entityId: uuidSchema,
  outcome: auditOutcomeSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: dateTimeSchema,
});
export const sessionInvestigationSchema = z.object({
  session: sessionSchema.partial().extend({ id: uuidSchema, status: z.string() }),
  trace: z.array(normalizedSessionEventSchema),
  artifacts: z.array(artifactSchema),
  snapshot: redactedSnapshotSchema,
  audits: z.array(auditEntrySchema),
});
export const traceResponseSchema = z.array(normalizedSessionEventSchema);
export const auditResponseSchema = z.array(auditEntrySchema);
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type SessionInvestigation = z.infer<typeof sessionInvestigationSchema>;
