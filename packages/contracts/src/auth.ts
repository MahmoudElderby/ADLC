import { z } from "zod";
import { uuidSchema } from "./common.js";

export const signInRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const actorSummarySchema = z.object({
  id: uuidSchema,
  displayName: z.string().min(1),
});

export const currentIdentitySchema = z.object({
  userId: uuidSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  workspaceId: uuidSchema,
  workspaceName: z.string().min(1),
});

export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type ActorSummary = z.infer<typeof actorSummarySchema>;
export type CurrentIdentity = z.infer<typeof currentIdentitySchema>;
