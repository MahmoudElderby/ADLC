import { z } from "zod";

const apiConfigSchema = z
  .object({
    nodeEnv: z.string().default("development"),
    port: z.coerce.number().int().positive().default(3000),
    databaseUrl: z.string().url(),
    openaiApiKey: z.string().min(1),
    secretEncryptionKey: z.string().min(32),
    allowPlaintextSecrets: z.coerce.boolean().default(false),
    operatorEmail: z.string().email(),
    operatorPassword: z.string().min(1),
    operatorDisplayName: z.string().min(1).default("Operator"),
    workspaceName: z.string().min(1).default("ADLC workspace"),
    connectorRegistrationToken: z.string().min(24),
    connectorToken: z.string().min(24).optional(),
    sessionIdleSeconds: z.coerce.number().int().positive().default(8 * 60 * 60),
    sessionAbsoluteSeconds: z.coerce.number().int().positive().default(24 * 60 * 60),
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
    operatorEmail: env.ADLC_OPERATOR_EMAIL,
    operatorPassword: env.ADLC_OPERATOR_PASSWORD,
    operatorDisplayName: env.ADLC_OPERATOR_DISPLAY_NAME,
    workspaceName: env.ADLC_WORKSPACE_NAME,
    connectorRegistrationToken: env.ADLC_CONNECTOR_REGISTRATION_TOKEN,
    connectorToken: env.ADLC_CONNECTOR_TOKEN,
    sessionIdleSeconds: env.ADLC_SESSION_IDLE_SECONDS,
    sessionAbsoluteSeconds: env.ADLC_SESSION_ABSOLUTE_SECONDS,
  });
}
