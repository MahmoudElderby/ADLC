import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { authenticatedSessions, workspaces, workspaceUsers } from "@adlc/database";
import { signInRequestSchema, type CurrentIdentity, type SignInRequest } from "@adlc/contracts";
import { eq } from "drizzle-orm";
import { AuditService } from "../../modules/observability-governance/audit.service.js";
import { DATABASE, type Database } from "../database/database.tokens.js";
import {
  hashPassword,
  hashSessionToken,
  nextExpiresAt,
  verifyPassword,
} from "./session-policy.js";

const genericUnauthorized = "Authentication required.";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audits: AuditService,
  ) {}

  async signIn(input: SignInRequest, correlationId = randomUUID()): Promise<string> {
    const request = signInRequestSchema.parse(input);
    const email = request.email.trim().toLowerCase();
    const [user] = await this.db
      .select({
        id: workspaceUsers.id,
        workspaceId: workspaceUsers.workspaceId,
        passwordHash: workspaceUsers.passwordHash,
      })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.email, email))
      .limit(1);

    const passwordOk = user
      ? await verifyPassword(user.passwordHash, request.password)
      : await verifyPassword(await this.unusedPasswordHash(), request.password);

    if (!user || !passwordOk) {
      this.logger.warn("Sign-in rejected.");
      throw new UnauthorizedException(genericUnauthorized);
    }

    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const [session] = await this.db
      .insert(authenticatedSessions)
      .values({
        workspaceId: user.workspaceId,
        userId: user.id,
        tokenHash: hashSessionToken(token),
        status: "active",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: nextExpiresAt(now, now, now),
      })
      .returning({ id: authenticatedSessions.id });

    await this.audits.record({
      workspaceId: user.workspaceId,
      actorId: user.id,
      action: "auth.sign_in",
      entityType: "authenticated_session",
      entityId: session.id,
      outcome: "succeeded",
      correlationId,
    });

    return token;
  }

  async signOut(token: string | undefined, correlationId = randomUUID()): Promise<void> {
    if (!token) {
      throw new UnauthorizedException(genericUnauthorized);
    }
    const tokenHash = hashSessionToken(token);
    const [session] = await this.db
      .select({
        id: authenticatedSessions.id,
        workspaceId: authenticatedSessions.workspaceId,
        userId: authenticatedSessions.userId,
        status: authenticatedSessions.status,
      })
      .from(authenticatedSessions)
      .where(eq(authenticatedSessions.tokenHash, tokenHash))
      .limit(1);
    if (!session || session.status !== "active") {
      throw new UnauthorizedException(genericUnauthorized);
    }

    await this.db
      .update(authenticatedSessions)
      .set({
        status: "revoked",
        revokedAt: new Date(),
      })
      .where(eq(authenticatedSessions.id, session.id));

    await this.audits.record({
      workspaceId: session.workspaceId,
      actorId: session.userId,
      action: "auth.sign_out",
      entityType: "authenticated_session",
      entityId: session.id,
      outcome: "succeeded",
      correlationId,
    });
  }

  async currentIdentity(userId: string, workspaceId: string): Promise<CurrentIdentity> {
    const [user] = await this.db
      .select({
        id: workspaceUsers.id,
        email: workspaceUsers.email,
        displayName: workspaceUsers.displayName,
        workspaceId: workspaceUsers.workspaceId,
      })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.id, userId))
      .limit(1);
    const [workspace] = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!user || !workspace) {
      throw new UnauthorizedException(genericUnauthorized);
    }
    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }

  private unusedPasswordHash(): Promise<string> {
    this.dummyHash ??= hashPassword("adlc-unused-password-placeholder");
    return this.dummyHash;
  }
}
