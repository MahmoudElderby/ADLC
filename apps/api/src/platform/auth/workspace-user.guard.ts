import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  REQUEST_CONTEXT_KEY,
  type RequestContext,
  type RequestWithContext,
} from "./request-context.js";

const workspaceHeader = "x-adlc-workspace-id";
const actorHeader = "x-adlc-actor-id";
const correlationHeader = "x-correlation-id";

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class WorkspaceUserGuard implements CanActivate {
  canActivate(executionContext: ExecutionContext): boolean {
    const request = executionContext.switchToHttp().getRequest<RequestWithContext>();
    const workspaceId = firstHeader(request.headers[workspaceHeader]);
    const actorId = firstHeader(request.headers[actorHeader]);

    if (!workspaceId || !actorId) {
      throw new UnauthorizedException("Workspace user context is required.");
    }

    const context: RequestContext = {
      workspaceId,
      actorId,
      correlationId: firstHeader(request.headers[correlationHeader]) ?? randomUUID(),
    };

    request[REQUEST_CONTEXT_KEY] = context;
    return true;
  }
}
