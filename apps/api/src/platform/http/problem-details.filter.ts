import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

type ProblemError = { field: string; message: string };

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  correlationId: string;
  errors?: ProblemError[];
  referencingAgents?: { id: string; name: string }[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function problemExtras(exception: unknown): {
  title?: string;
  detail?: string;
  errors?: ProblemError[];
  referencingAgents?: { id: string; name: string }[];
} {
  if (!(exception instanceof HttpException)) {
    return {};
  }
  const response = exception.getResponse();
  const root = typeof response === "string" ? { detail: response } : asRecord(response);
  const nested = asRecord(root.message);
  const source = Object.keys(nested).length > 0 ? { ...root, ...nested } : root;
  const errors = Array.isArray(source.errors)
    ? (source.errors as ProblemError[]).filter(
        (item) => item && typeof item.field === "string" && typeof item.message === "string",
      )
    : undefined;
  const referencingAgents = Array.isArray(source.referencingAgents)
    ? (source.referencingAgents as { id: string; name: string }[]).filter(
        (item) => item && typeof item.id === "string" && typeof item.name === "string",
      )
    : undefined;
  return {
    title: typeof source.title === "string" ? source.title : undefined,
    detail: typeof source.detail === "string" ? source.detail : undefined,
    errors: errors && errors.length > 0 ? errors : undefined,
    referencingAgents:
      referencingAgents && referencingAgents.length > 0 ? referencingAgents : undefined,
  };
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const isAuthFailure = status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN;
    const extras = problemExtras(exception);
    const detail = isAuthFailure
      ? "Authentication required."
      : extras.detail ??
        (exception instanceof Error ? exception.message : "An unexpected error occurred.");

    const title = isAuthFailure
      ? "Unauthorized"
      : extras.title ??
        (exception instanceof HttpException ? (HttpStatus[status] ?? "HTTP Error") : "Internal Server Error");

    const header = request.headers?.["x-correlation-id"];
    const correlationId = (Array.isArray(header) ? header[0] : header) ?? randomUUID();

    const body: ProblemDetails = {
      type: "about:blank",
      title,
      status,
      detail,
      correlationId,
    };
    if (!isAuthFailure && extras.errors) {
      body.errors = extras.errors;
    }
    if (!isAuthFailure && extras.referencingAgents) {
      body.referencingAgents = extras.referencingAgents;
    }

    void reply
      .code(status)
      .header("content-type", "application/problem+json; charset=utf-8")
      .send(body);
  }
}
