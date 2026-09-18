import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type ConnectorCommandEnvelope = {
  commandId: string;
  type: "start_executor" | "stop_executor";
  sessionId: string;
  expiresAt: string;
  [key: string]: unknown;
};

@Injectable()
export class ConnectorAuthService {
  issueToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string, salt = process.env.CONNECTOR_TOKEN_SALT ?? "adlc-dev-salt"): string {
    return createHmac("sha256", salt).update(token).digest("hex");
  }

  verifyToken(token: string, expectedHash: string): void {
    const actual = Buffer.from(this.hashToken(token), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Connector token is invalid.");
    }
  }

  validateCommandEnvelope(
    command: ConnectorCommandEnvelope,
    seenCommandIds: ReadonlySet<string>,
  ): void {
    if (seenCommandIds.has(command.commandId)) {
      throw new Error("Connector command replay rejected.");
    }

    if (new Date(command.expiresAt).getTime() <= Date.now()) {
      throw new Error("Connector command expired.");
    }

    if (!["start_executor", "stop_executor"].includes(command.type)) {
      throw new Error("Unsupported connector command.");
    }
  }
}
