import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { authenticatedSessions, workspaceUsers } from "@adlc/database";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "../database/database.module.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import {
  REQUEST_CONTEXT_KEY,
  type RequestContext,
  type RequestWithContext,
} from "./request-context.js";
import {
  SESSION_ABSOLUTE_SECONDS_DEFAULT,
  SESSION_IDLE_SECONDS_DEFAULT,
  evaluateSessionExpiry,
  hashSessionToken,
  nextExpiresAt,
} from "./session-policy.js";
import { SESSION_COOKIE_NAME } from "../http/session-cookie.js";

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

const genericUnauthorized = "Authentication required.";

@Injectable()
export class WorkspaceUserGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const request = executionContext.switchToHttp().getRequest<
      RequestWithContext & {
        cookies?: Record<string, string>;
        headers: Record<string, string | string[] | undefined>;
      }
    >();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const token =
      request.cookies?.[SESSION_COOKIE_NAME] ??
      readCookie(firstHeader(request.headers.cookie), SESSION_COOKIE_NAME);
    if (!token) {
      throw new UnauthorizedException(genericUnauthorized);
    }

    const tokenHash = hashSessionToken(token);
    const [session] = await this.db
      .select()
      .from(authenticatedSessions)
      .where(eq(authenticatedSessions.tokenHash, tokenHash))
      .limit(1);

    if (!session) {
      throw new UnauthorizedException(genericUnauthorized);
    }

    const idleSeconds = Number(process.env.ADLC_SESSION_IDLE_SECONDS ?? SESSION_IDLE_SECONDS_DEFAULT);
    const absoluteSeconds = Number(
      process.env.ADLC_SESSION_ABSOLUTE_SECONDS ?? SESSION_ABSOLUTE_SECONDS_DEFAULT,
    );
    const now = new Date();
    const expiry = evaluateSessionExpiry(session, now, idleSeconds, absoluteSeconds);
    if (expiry.expired) {
      if (session.status === "active") {
        await this.db
          .update(authenticatedSessions)
          .set({
            status: "expired",
          })
          .where(eq(authenticatedSessions.id, session.id));
      }
      throw new UnauthorizedException(genericUnauthorized);
    }

    const [user] = await this.db
      .select({ id: workspaceUsers.id, workspaceId: workspaceUsers.workspaceId })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.id, session.userId))
      .limit(1);
    if (!user) {
      throw new UnauthorizedException(genericUnauthorized);
    }

    const expiresAt = nextExpiresAt(session.createdAt, now, now, idleSeconds, absoluteSeconds);
    await this.db
      .update(authenticatedSessions)
      .set({
        lastSeenAt: now,
        expiresAt,
      })
      .where(eq(authenticatedSessions.id, session.id));

    const context: RequestContext = {
      workspaceId: session.workspaceId,
      actorId: session.userId,
      correlationId: firstHeader(request.headers["x-correlation-id"]) ?? randomUUID(),
    };
    request[REQUEST_CONTEXT_KEY] = context;
    void firstHeader(request.headers["x-adlc-workspace-id"]);
    void firstHeader(request.headers["x-adlc-actor-id"]);
    return true;
  }
}
