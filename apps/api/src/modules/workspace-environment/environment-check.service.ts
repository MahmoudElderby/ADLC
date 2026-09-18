import { Inject, Injectable } from "@nestjs/common";
import {
  environmentChecks,
  mcpServers,
  workspaceConnectors,
  workspaceSecrets,
} from "@adlc/database";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { SecretVaultService } from "../../platform/security/secret-vault.service.js";
import { AuditService } from "../observability-governance/audit.service.js";

export const CONNECTOR_ONLINE_WINDOW_MS = 30_000;
export const ENVIRONMENT_CHECK_TTL_MS = 10_000;

export type EnvironmentCheckEnvelope = {
  checkId: string;
  type: "mcp_reachability" | "environment_health";
  mcpId?: string;
  serverUrl?: string;
  allowedTools?: string[];
  credential?: string;
  workspacePath?: string;
  expiresAt: string;
};

export type EnvironmentCheckResultInput = {
  status: "answered" | "failed";
  reachability?: "reachable" | "unreachable";
  handshake?: "accepted" | "rejected" | "not_attempted";
  allowedToolsPresent?: boolean;
  filesystem?: string;
  observedAt: string;
  errorCode?: string | null;
  message?: string | null;
};

@Injectable()
export class EnvironmentCheckService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(SecretVaultService) private readonly secretVault: SecretVaultService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  isHeartbeatFresh(lastHeartbeatAt: Date | null | undefined): boolean {
    if (!lastHeartbeatAt) {
      return false;
    }
    return Date.now() - lastHeartbeatAt.getTime() < CONNECTOR_ONLINE_WINDOW_MS;
  }

  async findOnlineConnector(workspaceId: string) {
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.workspaceId, workspaceId))
      .limit(1);
    if (!connector || connector.revokedAt || !this.isHeartbeatFresh(connector.lastHeartbeatAt)) {
      return null;
    }
    return connector;
  }

  async markMcpUnverified(mcpId: string, summary: string): Promise<void> {
    await this.db
      .update(mcpServers)
      .set({
        reachabilityStatus: "unverified",
        reachabilitySummary: summary,
        validationSummary: summary,
        updatedAt: new Date(),
      })
      .where(eq(mcpServers.id, mcpId));
  }

  async requestMcpReachabilityCheck(input: {
    workspaceId: string;
    actorId: string;
    mcpId: string;
    serverUrl: string;
    allowedTools: string[];
  }): Promise<{ issued: boolean }> {
    await this.expireStaleChecks(input.workspaceId);
    const connector = await this.findOnlineConnector(input.workspaceId);
    if (!connector) {
      await this.markMcpUnverified(
        input.mcpId,
        "The workspace connector is offline, so reachability is unverified until it checks in.",
      );
      return { issued: false };
    }

    await this.db
      .update(environmentChecks)
      .set({ status: "expired" })
      .where(
        and(
          eq(environmentChecks.targetCapabilityId, input.mcpId),
          inArray(environmentChecks.status, ["pending", "claimed"]),
        ),
      );

    const expiresAt = new Date(Date.now() + ENVIRONMENT_CHECK_TTL_MS);
    const correlationId = crypto.randomUUID();
    const [check] = await this.db
      .insert(environmentChecks)
      .values({
        workspaceId: input.workspaceId,
        connectorId: connector.id,
        checkType: "mcp_reachability",
        targetCapabilityId: input.mcpId,
        status: "pending",
        payloadRedactedJson: {
          mcpId: input.mcpId,
          serverUrl: input.serverUrl,
          allowedTools: input.allowedTools,
        },
        correlationId,
        expiresAt,
      })
      .returning();

    await this.auditService.record({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "environment_check.requested",
      entityType: "mcp_server",
      entityId: input.mcpId,
      outcome: "succeeded",
      correlationId,
      metadata: { checkId: check.id, type: "mcp_reachability" },
    });

    await this.db
      .update(mcpServers)
      .set({
        reachabilityStatus: "unverified",
        reachabilitySummary: "Waiting for the workspace connector to answer a reachability check.",
        updatedAt: new Date(),
      })
      .where(eq(mcpServers.id, input.mcpId));

    return { issued: true };
  }

  async nextCheck(connectorId: string, waitSeconds: number): Promise<EnvironmentCheckEnvelope | null> {
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, connectorId))
      .limit(1);
    if (!connector) {
      return null;
    }

    const deadline = Date.now() + Math.min(Math.max(waitSeconds, 0), 25) * 1_000;
    while (true) {
      await this.expireStaleChecks(connector.workspaceId);
      const [check] = await this.db
        .select()
        .from(environmentChecks)
        .where(
          and(
            eq(environmentChecks.connectorId, connectorId),
            eq(environmentChecks.status, "pending"),
          ),
        )
        .orderBy(desc(environmentChecks.requestedAt))
        .limit(1);

      if (check) {
        await this.db
          .update(environmentChecks)
          .set({ status: "claimed", claimedAt: new Date() })
          .where(eq(environmentChecks.id, check.id));
        return this.toEnvelope(check);
      }

      if (Date.now() >= deadline) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async reportResult(
    connectorId: string,
    checkId: string,
    body: EnvironmentCheckResultInput,
  ): Promise<{ accepted: boolean; status: string }> {
    const [connector] = await this.db
      .select()
      .from(workspaceConnectors)
      .where(eq(workspaceConnectors.id, connectorId))
      .limit(1);
    if (!connector) {
      return { accepted: false, status: "rejected" };
    }

    const [check] = await this.db
      .select()
      .from(environmentChecks)
      .where(eq(environmentChecks.id, checkId))
      .limit(1);

    if (!check || check.connectorId !== connectorId) {
      if (!check) {
        try {
          await this.db.insert(environmentChecks).values({
            id: checkId,
            workspaceId: connector.workspaceId,
            connectorId,
            checkType: "mcp_reachability",
            status: "rejected",
            payloadRedactedJson: { reason: "unknown_check_id" },
            resultRedactedJson: { message: body.message ?? "Unexpected check id." },
            correlationId: crypto.randomUUID(),
            expiresAt: new Date(),
            answeredAt: new Date(),
          });
        } catch {
          // Shared Postgres may already hold this unexpected check id from an earlier run.
        }
      }
      return { accepted: false, status: "rejected" };
    }

    const existingPayload = (check.payloadRedactedJson ?? {}) as { reason?: string };
    if (existingPayload.reason === "unknown_check_id") {
      return { accepted: false, status: "rejected" };
    }

    const expired = check.status === "expired" || check.expiresAt.getTime() <= Date.now();
    const latestForTarget = check.targetCapabilityId
      ? (
          await this.db
            .select({ id: environmentChecks.id })
            .from(environmentChecks)
            .where(eq(environmentChecks.targetCapabilityId, check.targetCapabilityId))
            .orderBy(desc(environmentChecks.requestedAt))
            .limit(1)
        )[0]
      : undefined;
    const isLatest = !latestForTarget || latestForTarget.id === check.id;
    const applyToCapability = !expired && isLatest && (check.status === "pending" || check.status === "claimed");

    await this.db
      .update(environmentChecks)
      .set({
        status: expired || !applyToCapability ? (expired ? "expired" : "rejected") : "answered",
        answeredAt: new Date(),
        resultRedactedJson: {
          status: body.status,
          reachability: body.reachability ?? null,
          handshake: body.handshake ?? null,
          allowedToolsPresent: body.allowedToolsPresent ?? null,
          filesystem: body.filesystem ?? null,
          errorCode: body.errorCode ?? null,
          message: body.message ?? null,
        },
      })
      .where(eq(environmentChecks.id, checkId));

    if (applyToCapability && check.targetCapabilityId && check.checkType === "mcp_reachability") {
      await this.applyMcpResult(check.targetCapabilityId, body);
    }

    await this.auditService.record({
      workspaceId: connector.workspaceId,
      actorId: connector.id,
      action: applyToCapability ? "environment_check.answered" : "environment_check.expired",
      entityType: "mcp_server",
      entityId: check.targetCapabilityId ?? check.id,
      outcome: applyToCapability ? "succeeded" : "failed",
      correlationId: check.correlationId,
      metadata: { checkId, reachability: body.reachability ?? null },
    });

    return { accepted: applyToCapability, status: applyToCapability ? "answered" : "rejected" };
  }

  private async applyMcpResult(mcpId: string, body: EnvironmentCheckResultInput): Promise<void> {
    const reachable =
      body.reachability === "reachable" &&
      body.handshake === "accepted" &&
      body.allowedToolsPresent === true;
    const summary = reachable
      ? "Streamable HTTP handshake succeeded and at least one allowed tool is present."
      : body.message ||
        (body.handshake === "accepted"
          ? "Handshake succeeded but none of the allowed tools are advertised."
          : "The workspace connector could not complete a Streamable HTTP handshake.");
    await this.db
      .update(mcpServers)
      .set({
        reachabilityStatus: reachable ? "reachable" : "unreachable",
        reachabilitySummary: summary,
        reachabilityCheckedAt: new Date(),
        status: reachable ? "valid" : "invalid",
        validationSummary: summary,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mcpServers.id, mcpId));
  }

  private async expireStaleChecks(workspaceId: string): Promise<void> {
    const stale = await this.db
      .select()
      .from(environmentChecks)
      .where(
        and(
          eq(environmentChecks.workspaceId, workspaceId),
          inArray(environmentChecks.status, ["pending", "claimed"]),
          lt(environmentChecks.expiresAt, new Date()),
        ),
      );

    for (const check of stale) {
      await this.db
        .update(environmentChecks)
        .set({ status: "expired" })
        .where(eq(environmentChecks.id, check.id));
      if (check.targetCapabilityId) {
        const [mcp] = await this.db
          .select({
            reachabilityStatus: mcpServers.reachabilityStatus,
          })
          .from(mcpServers)
          .where(eq(mcpServers.id, check.targetCapabilityId))
          .limit(1);
        if (mcp && mcp.reachabilityStatus === "unverified") {
          await this.markMcpUnverified(
            check.targetCapabilityId,
            "The environment check expired before the connector answered. Reachability is unverified.",
          );
        }
      }
      await this.auditService.record({
        workspaceId,
        actorId: check.connectorId,
        action: "environment_check.expired",
        entityType: "mcp_server",
        entityId: check.targetCapabilityId ?? check.id,
        outcome: "failed",
        correlationId: check.correlationId,
        metadata: { checkId: check.id },
      });
    }
  }

  private async toEnvelope(
    check: typeof environmentChecks.$inferSelect,
  ): Promise<EnvironmentCheckEnvelope> {
    const payload = (check.payloadRedactedJson ?? {}) as {
      mcpId?: string;
      serverUrl?: string;
      allowedTools?: string[];
      workspacePath?: string;
    };
    const envelope: EnvironmentCheckEnvelope = {
      checkId: check.id,
      type: check.checkType,
      expiresAt: check.expiresAt.toISOString(),
    };
    if (check.checkType === "mcp_reachability") {
      envelope.mcpId = payload.mcpId ?? check.targetCapabilityId ?? undefined;
      envelope.serverUrl = payload.serverUrl;
      envelope.allowedTools = payload.allowedTools;
      if (check.targetCapabilityId) {
        const [mcp] = await this.db
          .select({ credentialSecretId: mcpServers.credentialSecretId })
          .from(mcpServers)
          .where(eq(mcpServers.id, check.targetCapabilityId))
          .limit(1);
        if (mcp?.credentialSecretId) {
          const [secret] = await this.db
            .select()
            .from(workspaceSecrets)
            .where(eq(workspaceSecrets.id, mcp.credentialSecretId))
            .limit(1);
          if (secret) {
            envelope.credential = this.secretVault.decrypt({
              ciphertext: secret.encryptedValue,
              fingerprint: secret.fingerprint,
              keyVersion: secret.keyVersion,
            });
          }
        }
      }
    } else {
      envelope.workspacePath = payload.workspacePath;
    }
    return envelope;
  }
}
