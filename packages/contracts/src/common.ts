import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const dateTimeSchema = z.string().datetime({ offset: true });

export const capabilityStatusSchema = z.enum([
  "pending_validation",
  "valid",
  "invalid",
  "unreachable",
]);

export const connectorStatusSchema = z.enum(["offline", "online", "degraded"]);
export const validationStatusSchema = capabilityStatusSchema;
export const auditOutcomeSchema = z.enum(["succeeded", "failed"]);

export const problemErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const problemDetailsSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  correlationId: uuidSchema,
  errors: z.array(problemErrorSchema).optional(),
});

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pageInfo: z.object({
      limit: z.number().int().positive(),
      offset: z.number().int().min(0),
      total: z.number().int().min(0).optional(),
    }),
  });
}

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
