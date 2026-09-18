import { z } from "zod";

const connectorConfigSchema = z
  .object({
    apiUrl: z.string().url(),
    connectorToken: z.string().min(24),
    workspacePath: z.string().min(1),
    openaiExecutorApiKey: z.string().min(1),
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

export type ConnectorConfig = z.infer<typeof connectorConfigSchema>;

export function loadConnectorConfig(env: NodeJS.ProcessEnv = process.env): ConnectorConfig {
  return connectorConfigSchema.parse({
    apiUrl: env.ADLC_API_URL,
    connectorToken: env.ADLC_CONNECTOR_TOKEN,
    workspacePath: env.ADLC_WORKSPACE_PATH,
    openaiExecutorApiKey: env.OPENAI_EXECUTOR_API_KEY,
    allowPlaintextSecrets: env.ALLOW_PLAINTEXT_SECRETS,
  });
}
