import { z } from "zod";

const apiConfigSchema = z
  .object({
    nodeEnv: z.string().default("development"),
    port: z.coerce.number().int().positive().default(3000),
    databaseUrl: z.string().url(),
    openaiApiKey: z.string().min(1),
    secretEncryptionKey: z.string().min(32),
    allowPlaintextSecrets: z.coerce.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.allowPlaintextSecrets) {
      context.addIssue({
        code: "custom",
        path: ["allowPlaintextSecrets"],
        message: "Plaintext secret persistence is not allowed.",
      });
    }
  });

export type ApiConfig = z.infer<typeof apiConfigSchema>;

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return apiConfigSchema.parse({
    nodeEnv: env.NODE_ENV,
    port: env.API_PORT ?? env.PORT,
    databaseUrl: env.DATABASE_URL,
    openaiApiKey: env.OPENAI_API_KEY,
    secretEncryptionKey: env.SECRET_ENCRYPTION_KEY,
    allowPlaintextSecrets: env.ALLOW_PLAINTEXT_SECRETS,
  });
}
