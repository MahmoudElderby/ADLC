import { describe, expect, it } from "vitest";
import {
  evaluateSessionExpiry,
  hashPassword,
  hashSessionToken,
  nextExpiresAt,
  verifyPassword,
} from "../../src/platform/auth/session-policy.js";

describe("session policy", () => {
  const createdAt = new Date("2026-09-18T00:00:00.000Z");

  it("expires a session after 8 hours idle", () => {
    const lastSeenAt = new Date("2026-09-18T00:00:00.000Z");
    const justUnder = evaluateSessionExpiry(
      { createdAt, lastSeenAt, status: "active" },
      new Date("2026-09-18T07:59:59.000Z"),
    );
    const idle = evaluateSessionExpiry(
      { createdAt, lastSeenAt, status: "active" },
      new Date("2026-09-18T08:00:00.000Z"),
    );
    expect(justUnder).toEqual({ expired: false, reason: null });
    expect(idle).toEqual({ expired: true, reason: "idle" });
  });

  it("expires a session after 24 hours absolute even if recently seen", () => {
    const lastSeenAt = new Date("2026-09-18T23:59:00.000Z");
    const result = evaluateSessionExpiry(
      { createdAt, lastSeenAt, status: "active" },
      new Date("2026-09-19T00:00:00.000Z"),
    );
    expect(result).toEqual({ expired: true, reason: "absolute" });
  });

  it("does not use client identity headers to compute expiry bounds", () => {
    const expiresAt = nextExpiresAt(
      createdAt,
      new Date("2026-09-18T01:00:00.000Z"),
      new Date("2026-09-18T01:00:00.000Z"),
    );
    expect(expiresAt.toISOString()).toBe("2026-09-18T09:00:00.000Z");
    expect(hashSessionToken("cookie-token")).not.toBe("cookie-token");
  });

  it("verifies Argon2id password hashes", async () => {
    const hash = await hashPassword("ChangeMeOperatorPass1");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "ChangeMeOperatorPass1")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });
});
