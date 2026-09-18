import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export async function registerRequestLoggingHook(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const incoming = request.headers["x-correlation-id"];
    request.headers["x-correlation-id"] = Array.isArray(incoming)
      ? incoming[0]
      : (incoming ?? randomUUID());
  });

  fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info(
      {
        correlationId: request.headers["x-correlation-id"],
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      },
      "request completed",
    );
  });
}
