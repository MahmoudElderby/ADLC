import { createHash, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

export const SESSION_COOKIE_NAME = "adlc_session";
export const SESSION_IDLE_SECONDS_DEFAULT = 8 * 60 * 60;
export const SESSION_ABSOLUTE_SECONDS_DEFAULT = 24 * 60 * 60;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(actualHex: string, expectedHex: string): boolean {
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function nextExpiresAt(
  createdAt: Date,
  lastSeenAt: Date,
  now: Date,
  idleSeconds = SESSION_IDLE_SECONDS_DEFAULT,
  absoluteSeconds = SESSION_ABSOLUTE_SECONDS_DEFAULT,
): Date {
  const idleDeadline = lastSeenAt.getTime() + idleSeconds * 1000;
  const absoluteDeadline = createdAt.getTime() + absoluteSeconds * 1000;
  return new Date(Math.min(idleDeadline, absoluteDeadline, now.getTime() + idleSeconds * 1000));
}

export function evaluateSessionExpiry(
  input: {
    createdAt: Date;
    lastSeenAt: Date;
    status: "active" | "revoked" | "expired";
  },
  now = new Date(),
  idleSeconds = SESSION_IDLE_SECONDS_DEFAULT,
  absoluteSeconds = SESSION_ABSOLUTE_SECONDS_DEFAULT,
): { expired: boolean; reason: "idle" | "absolute" | "revoked" | "expired" | null } {
  if (input.status === "revoked") {
    return { expired: true, reason: "revoked" };
  }
  if (input.status === "expired") {
    return { expired: true, reason: "expired" };
  }
  if (now.getTime() >= input.createdAt.getTime() + absoluteSeconds * 1000) {
    return { expired: true, reason: "absolute" };
  }
  if (now.getTime() >= input.lastSeenAt.getTime() + idleSeconds * 1000) {
    return { expired: true, reason: "idle" };
  }
  return { expired: false, reason: null };
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
