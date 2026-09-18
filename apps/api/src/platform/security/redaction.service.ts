import { Injectable } from "@nestjs/common";

const sensitiveKeyPattern =
  /(authorization|cookie|secret|token|password|credential|api[-_]?key|remoteurl)/i;
const bearerPattern = /bearer\s+[a-z0-9._~+/=-]+/gi;
const apiKeyPattern = /\b(?:sk|sess|key)-[a-z0-9_-]{8,}\b/gi;

@Injectable()
export class RedactionService {
  private readonly knownSecrets = new Set<string>();

  registerSecretCanary(value: string): void {
    if (value) {
      this.knownSecrets.add(value);
    }
  }

  redact<T>(value: T): T {
    return this.redactValue(value) as T;
  }

  private redactValue(value: unknown, key?: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (key && sensitiveKeyPattern.test(key)) {
      return "[REDACTED]";
    }

    if (typeof value === "string") {
      return this.redactString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
          entryKey,
          this.redactValue(entryValue, entryKey),
        ]),
      );
    }

    return value;
  }

  private redactString(value: string): string {
    let redacted = value
      .replace(bearerPattern, "Bearer [REDACTED]")
      .replace(apiKeyPattern, "[REDACTED]");

    for (const secret of this.knownSecrets) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }

    return redacted;
  }
}
