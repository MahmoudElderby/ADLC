import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const commandEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({
    commandId: z.string().uuid(),
    type: z.literal("start_executor"),
    sessionId: z.string().uuid(),
    environmentId: z.string().min(1),
    remoteUrl: z.string().url().startsWith("wss://"),
    workspacePath: z.string().min(1),
    expiresAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    commandId: z.string().uuid(),
    type: z.literal("stop_executor"),
    sessionId: z.string().uuid(),
    reason: z.string().min(1),
    expiresAt: z.string().datetime({ offset: true }),
  }),
]);

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;

export function connectorAuthorizationHeader(token: string): string {
  return `Bearer ${token}`;
}

export function hashConnectorToken(token: string, salt: string): string {
  return createHmac("sha256", salt).update(token).digest("hex");
}

export function verifyControlPlaneSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function validateReplaySafeCommand(
  input: unknown,
  completedCommandIds: ReadonlySet<string>,
): CommandEnvelope {
  const command = commandEnvelopeSchema.parse(input);

  if (completedCommandIds.has(command.commandId)) {
    throw new Error("Command replay rejected.");
  }

  if (new Date(command.expiresAt).getTime() <= Date.now()) {
    throw new Error("Command expired.");
  }

  return command;
}
