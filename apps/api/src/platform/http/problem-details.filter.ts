import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  correlationId: string;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status: (status: number) => {
        type: (mime: string) => { send: (body: ProblemDetails) => void };
      };
    }>();
    const request = http.getRequest<{ headers?: Record<string, string | string[] | undefined> }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const detail = exception instanceof Error ? exception.message : "An unexpected error occurred.";

    const title =
      exception instanceof HttpException
        ? (HttpStatus[status] ?? "HTTP Error")
        : "Internal Server Error";

    const header = request.headers?.["x-correlation-id"];
    const correlationId = (Array.isArray(header) ? header[0] : header) ?? randomUUID();

    response.status(status).type("application/problem+json").send({
      type: "about:blank",
      title,
      status,
      detail,
      correlationId,
    });
  }
}
