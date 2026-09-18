import { describe, expect, it } from "vitest";
import { RedactionService } from "../../src/platform/security/redaction.service.js";
import { SecretVaultService } from "../../src/platform/security/secret-vault.service.js";

describe("security redaction", () => {
  it("redacts configured canaries from nested browser-visible payloads", () => {
    const redaction = new RedactionService();
    redaction.registerSecretCanary("canary-secret-value");

    const payload = {
      message: "Bearer canary-secret-value",
      nested: {
        token: "canary-secret-value",
        safe: "visible",
        list: ["before canary-secret-value after"],
      },
    };

    const redacted = redaction.redact(payload);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("canary-secret-value");
    expect(serialized).toContain("[REDACTED]");
    expect(redacted.nested.safe).toBe("visible");
  });

  it("does not expose encrypted secret plaintext through redacted reads", () => {
    const vault = new SecretVaultService("test-root-key-that-is-definitely-32-bytes");
    const encrypted = vault.encrypt("canary-secret-value");
    const redacted = vault.readRedacted(encrypted);

    expect(encrypted.ciphertext).not.toContain("canary-secret-value");
    expect(JSON.stringify(redacted)).not.toContain("canary-secret-value");
    expect(redacted.value).toBe("[REDACTED]");
    expect(vault.decrypt(encrypted)).toBe("canary-secret-value");
  });
});
