import { z } from "zod";
import { dateTimeSchema, uuidSchema } from "./common.js";
import { sessionStatusSchema, terminalSessionStatusSchema } from "./sessions.js";

export const navigationLinksSchema = z.object({ session: z.string().min(1), agent: z.string().min(1) });
export const liveFleetItemSchema = z.object({
  sessionId: uuidSchema,
  agentId: uuidSchema,
  agentName: z.string(),
  status: z.enum(["creating", "provisioning", "running"]),
  skillCount: z.number().int().nonnegative(),
  mcpCount: z.number().int().nonnegative(),
  lastSummary: z.string().nullable(),
  lastEventAt: dateTimeSchema,
  links: navigationLinksSchema,
});
export const sessionHistoryItemSchema = z.object({
  sessionId: uuidSchema,
  agentId: uuidSchema,
  agentName: z.string(),
  status: terminalSessionStatusSchema.or(sessionStatusSchema),
  createdAt: dateTimeSchema,
  terminalAt: dateTimeSchema.nullable(),
  failureSummary: z.string().nullable(),
  links: navigationLinksSchema,
});
export type LiveFleetItem = z.infer<typeof liveFleetItemSchema>;
export type SessionHistoryItem = z.infer<typeof sessionHistoryItemSchema>;
export const liveFleetResponseSchema = z.array(liveFleetItemSchema);
export const sessionHistoryResponseSchema = z.array(sessionHistoryItemSchema);
