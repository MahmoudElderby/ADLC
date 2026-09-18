import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { sessionRuntimeSecrets, workspaceConnectorCommands, workspaceConnectors } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { Public } from "../../platform/auth/public.decorator.js";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { ConnectorAuthService } from "./connector-auth.service.js";
import { EnvironmentCheckService } from "./environment-check.service.js";
import { WorkspaceEnvironmentService } from "./workspace-environment.service.js";
import { WorkspaceBootstrap } from "../../platform/database/workspace-bootstrap.js";

@Public()
@Controller("connectors")
export class ConnectorController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ConnectorAuthService) private readonly connectorAuth: ConnectorAuthService,
    @Inject(WorkspaceEnvironmentService) private readonly workspaceEnvironment: WorkspaceEnvironmentService,
    @Inject(SecretVaultService) private readonly secretVault: SecretVaultService,
    @Inject(EnvironmentCheckService) private readonly environmentChecks: EnvironmentCheckService,
    @Inject(WorkspaceBootstrap) private readonly bootstrap: WorkspaceBootstrap,
  ) {}

  @Post("register")
  async register(
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      name?: string;
      hostFingerprint?: string;
      connectorVersion?: string;
      platform?: string;
      workspacePath?: string;
    },
  ) {
    this.requireRegistrationSecret(authorization);
    const graph = await this.bootstrap.ensurePlatformWorkspace();
    const token = this.connectorAuth.issueToken();
    const tokenHash = this.connectorAuth.hashToken(token);
    const [existing] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.workspaceId, graph.workspaceId))
      .limit(1);

    let connectorId = existing?.id;
    if (existing) {
      await this.db
        .update(workspaceConnectors)
        .set({
          name: body.name ?? existing.name,
          hostFingerprint: body.hostFingerprint ?? existing.hostFingerprint,
          version: body.connectorVersion ?? existing.version,
          authTokenHash: tokenHash,
          status: "offline",
        })
        .where(eq(workspaceConnectors.id, existing.id));
    } else {
      const [created] = await this.db
        .insert(workspaceConnectors)
        .values({
          workspaceId: graph.workspaceId,
          name: body.name ?? "self-hosted-connector",
          authTokenHash: tokenHash,
          hostFingerprint: body.hostFingerprint ?? "unregistered",
          status: "offline",
          version: body.connectorVersion ?? "0.2.0",
          capabilitiesJson: { filesystem: true, network: true },
          lastHeartbeatAt: null,
        })
        .returning();
      connectorId = created.id;
    }

    return {
      connectorId,
      token,
      workspaceId: graph.workspaceId,
    };
  }

  @Post(":connectorId/heartbeat")
  @HttpCode(200)
  async heartbeat(
    @Param("connectorId") connectorId: string,
    @Headers("authorization") authorization: string | undefined,
    @Body()
    body: {
      connectorVersion?: string;
      hostFingerprint?: string;
      platform?: string;
      observedAt?: string;
      workspace?: { readable?: boolean; writable?: boolean };
      activeExecutors?: number;
    },
  ) {
    await this.requireConnector(connectorId, authorization);
    await this.workspaceEnvironment.recordHeartbeat(connectorId, {
      connectorVersion: body.connectorVersion,
      hostFingerprint: body.hostFingerprint,
      workspace: body.workspace,
      observedAt: body.observedAt,
    });
    return { ok: true, revalidate: false };
  }

  @Get(":connectorId/checks/next")
  async nextCheck(
    @Param("connectorId") connectorId: string,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Query("waitSeconds") waitSecondsRaw?: string,
  ) {
    await this.requireConnector(connectorId, authorization);
    const waitSeconds = Math.min(Math.max(Number(waitSecondsRaw ?? 0) || 0, 0), 25);
    const check = await this.environmentChecks.nextCheck(connectorId, waitSeconds);
    if (!check) {
      reply.code(204);
      return;
    }
    return check;
  }

  @Post(":connectorId/checks/:checkId/result")
  @HttpCode(200)
  async reportCheckResult(
    @Param("connectorId") connectorId: string,
    @Param("checkId") checkId: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Parameters<EnvironmentCheckService["reportResult"]>[2],
  ) {
    await this.requireConnector(connectorId, authorization);
    return this.environmentChecks.reportResult(connectorId, checkId, body);
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

  private requireRegistrationSecret(authorization: string | undefined): void {
    const expected = process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ?? "";
    const provided = authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (
      !expected ||
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException("Connector registration secret is invalid.");
    }
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
