import { Inject, Injectable } from "@nestjs/common";
import type { Artifact, Session } from "@adlc/contracts";
import { artifacts } from "@adlc/database";
import { and, eq } from "drizzle-orm";
import { DATABASE, type Database } from "../../platform/database/database.module.js";
import { RedactionService } from "../../platform/security/redaction.service.js";
import { ConnectorCommandService } from "../workspace-environment/connector-command.service.js";

export type ArtifactReportInput = {
  sourceEventId: string;
  name: string;
  workspaceRelativePath: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ArtifactService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly redactionService: RedactionService,
    private readonly connectorCommandService: ConnectorCommandService,
  ) {}

  async recordArtifactReport(session: Session, input: ArtifactReportInput): Promise<Artifact> {
    const workspaceId = this.extractWorkspaceId(session);
    const [existing] = await this.db
      .select()
      .from(artifacts)
      .where(
        and(eq(artifacts.sessionId, session.id), eq(artifacts.sourceEventId, input.sourceEventId)),
      )
      .limit(1);
    if (existing) {
      return this.toArtifact(existing);
    }

    const workspace = session.snapshotSummary?.workspace;
    const workspacePath =
      typeof workspace === "object" && workspace && "workspacePath" in workspace
        ? String(workspace.workspacePath)
        : "/workspace/adlc";
    const probe = await this.connectorCommandService.validateArtifact(
      workspacePath,
      input.workspaceRelativePath,
    );
    const current = await this.listSessionArtifacts(workspaceId, session.id);
    const now = new Date();
    const [row] = await this.db
      .insert(artifacts)
      .values({
        workspaceId,
        sessionId: session.id,
        sourceEventId: input.sourceEventId,
        reportSequence: current.length + 1,
        name: input.name,
        artifactType: "markdown",
        workspaceRelativePath: probe.workspaceRelativePath,
        status: probe.status,
        producerAgentId: session.agentId,
        metadataRedactedJson: this.redactionService.redact({
          sourceEventId: input.sourceEventId,
          ...(input.metadata ?? {}),
        }),
        reportedAt: now,
        validatedAt: now,
      })
      .returning();
    return this.toArtifact(row);
  }

  async listSessionArtifacts(workspaceId: string, sessionId: string): Promise<Artifact[]> {
    const rows = await this.db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.sessionId, sessionId), eq(artifacts.workspaceId, workspaceId)));
    return rows.map((row) => this.toArtifact(row));
  }

  private extractWorkspaceId(session: Session): string {
    const workspace = session.snapshotSummary?.workspace;
    if (typeof workspace === "object" && workspace && "id" in workspace) {
      return String(workspace.id);
    }
    return "unknown";
  }

  private toArtifact(row: typeof artifacts.$inferSelect): Artifact {
    return {
      id: row.id,
      sessionId: row.sessionId,
      reportSequence: Number(row.reportSequence),
      name: row.name,
      type: "markdown",
      workspaceRelativePath: row.workspaceRelativePath,
      status: row.status,
      producerAgentId: row.producerAgentId,
      reportedAt: row.reportedAt.toISOString(),
      validatedAt: row.validatedAt?.toISOString() ?? null,
    };
  }
}
