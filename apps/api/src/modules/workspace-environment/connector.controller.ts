import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { sessionRuntimeSecrets, workspaceConnectorCommands, workspaceConnectors } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { ConnectorAuthService } from "./connector-auth.service.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";

@Controller("connectors")
export class ConnectorController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly connectorAuth: ConnectorAuthService,
    private readonly workspaceEnvironment: WorkspaceEnvironmentService,
    private readonly secretVault: SecretVaultService,
  ) {}

  @Post(":connectorId/heartbeat")
  async heartbeat(
    @Param("connectorId") connectorId: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { connectorVersion?: string; hostFingerprint?: string },
  ) {
    const connector = await this.requireConnector(connectorId, authorization);
    await this.db
      .update(workspaceConnectors)
      .set({
        status: "online",
        version: body.connectorVersion ?? connector.version,
        hostFingerprint: body.hostFingerprint ?? connector.hostFingerprint,
        lastHeartbeatAt: new Date(),
      })
      .where(eq(workspaceConnectors.id, connectorId));
    await this.workspaceEnvironment.validate(connector.workspaceId);
    return { ok: true, revalidate: false };
  }

  @Get(":connectorId/commands/next")
  async nextCommand(
    @Param("connectorId") connectorId: string,
    @Headers("authorization") authorization: string | undefined,
    @Query("waitSeconds") waitSecondsRaw?: string,
  ) {
    await this.requireConnector(connectorId, authorization);
    const waitSeconds = Math.min(Math.max(Number(waitSecondsRaw ?? 0) || 0, 0), 25);
    const deadline = Date.now() + waitSeconds * 1_000;
    while (true) {
      const [command] = await this.db
        .select()
        .from(workspaceConnectorCommands)
        .where(
          and(
            eq(workspaceConnectorCommands.connectorId, connectorId),
            eq(workspaceConnectorCommands.status, "pending"),
          ),
        )
        .limit(1);
      if (command) {
        await this.db
          .update(workspaceConnectorCommands)
          .set({ status: "claimed", claimedAt: new Date() })
          .where(eq(workspaceConnectorCommands.id, command.id));
        const payload = (command.payloadRedactedJson ?? {}) as Record<string, unknown>;
        if (command.commandType === "start_executor") {
          const [secret] = await this.db
            .select()
            .from(sessionRuntimeSecrets)
            .where(eq(sessionRuntimeSecrets.sessionId, command.sessionId))
            .limit(1);
          const remoteUrl = secret
            ? this.secretVault.decrypt({
                ciphertext: secret.remoteUrlEncrypted,
                fingerprint: "runtime",
                keyVersion: secret.keyVersion,
              })
            : "";
          return {
            commandId: command.id,
            type: "start_executor",
            sessionId: command.sessionId,
            environmentId: String(payload.environmentId ?? ""),
            remoteUrl,
            workspacePath: String(payload.workspacePath ?? ""),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          };
        }
        return {
          commandId: command.id,
          type: "stop_executor",
          sessionId: command.sessionId,
          reason: String(payload.reason ?? "stop"),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
      }
      if (Date.now() >= deadline) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  @Post(":connectorId/commands/:commandId/result")
  async reportResult(
    @Param("connectorId") connectorId: string,
    @Param("commandId") commandId: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { status: "succeeded" | "failed"; message?: string },
  ) {
    await this.requireConnector(connectorId, authorization);
    const [command] = await this.db
      .select()
      .from(workspaceConnectorCommands)
      .where(eq(workspaceConnectorCommands.id, commandId))
      .limit(1);
    if (!command) {
      throw new NotFoundException("Connector command not found.");
    }
    await this.db
      .update(workspaceConnectorCommands)
      .set({
        status: body.status,
        completedAt: new Date(),
        errorSummary: body.message ?? null,
      })
      .where(eq(workspaceConnectorCommands.id, commandId));
    return { ok: true };
  }

  private async requireConnector(connectorId: string, authorization: string | undefined) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("Connector token is required.");
    }
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, connectorId))
      .limit(1);
    if (!connector) {
      throw new NotFoundException("Connector not found.");
    }
    try {
      this.connectorAuth.verifyToken(token, connector.authTokenHash);
    } catch {
      throw new UnauthorizedException("Connector token is invalid.");
    }
    return connector;
  }
}
