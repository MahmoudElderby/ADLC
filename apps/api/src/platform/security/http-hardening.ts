import type { FastifyAdapter } from "@nestjs/platform-fastify";

export const productionHeaders = {
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export type RateLimitState = { count: number; resetAt: number };

export function allowRequest(
  state: RateLimitState | undefined,
  now = Date.now(),
  limit = 120,
  windowMs = 60_000,
): { allowed: boolean; state: RateLimitState } {
  const current = !state || state.resetAt <= now ? { count: 0, resetAt: now + windowMs } : state;
  const next = { count: current.count + 1, resetAt: current.resetAt };
  return { allowed: next.count <= limit, state: next };
}

export function configureHttpHardening(adapter: FastifyAdapter): void {
  const instance = adapter.getInstance();
  const limits = new Map<string, RateLimitState>();

  instance.addHook("onRequest", async (request, reply) => {
    for (const [name, value] of Object.entries(productionHeaders)) reply.header(name, value);
    const key = request.ip;
    const decision = allowRequest(limits.get(key));
    limits.set(key, decision.state);
    if (!decision.allowed) {
      return reply.code(429).send({ type: "about:blank", title: "Too Many Requests", status: 429 });
    }
  });
}
