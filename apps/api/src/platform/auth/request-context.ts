import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type RequestContext = {
  workspaceId: string;
  actorId: string;
  correlationId: string;
};

export const REQUEST_CONTEXT_KEY = Symbol("adlcRequestContext");

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  [REQUEST_CONTEXT_KEY]?: RequestContext;
};

export function getRequestContext(request: RequestWithContext): RequestContext {
  if (!request[REQUEST_CONTEXT_KEY]) {
    throw new Error("Request context has not been established.");
  }

  return request[REQUEST_CONTEXT_KEY];
}

export const CurrentRequestContext = createParamDecorator(
  (_data: unknown, executionContext: ExecutionContext): RequestContext => {
    const request = executionContext.switchToHttp().getRequest<RequestWithContext>();
    return getRequestContext(request);
  },
);
