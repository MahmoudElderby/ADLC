export const connectorTimeouts = {
  heartbeatMs: 10_000,
  longPollMs: 30_000,
  commandMs: 15_000,
} as const;

export function boundedTimeoutMs(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value as number), 1_000), 60_000);
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), boundedTimeoutMs(timeoutMs, 15_000));
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function assertAllowedControlPlaneUrl(url: string): URL {
  const parsed = new URL(url);
  const localDevelopmentHost = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && localDevelopmentHost)) {
    throw new Error("Connector control-plane requests require HTTPS.");
  }
  return parsed;
}
