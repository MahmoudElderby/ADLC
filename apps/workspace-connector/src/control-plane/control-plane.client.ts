import {
  connectorAuthorizationHeader,
  type CommandEnvelope,
} from "../security/control-plane-auth.js";
import {
  assertAllowedControlPlaneUrl,
  boundedTimeoutMs,
  connectorTimeouts,
  withTimeout,
} from "../security/network-policy.js";

export type CommandResult = {
  status: "succeeded" | "failed";
  executorStatus: "connected" | "stopped" | "failed";
  observedAt: string;
  errorCode: string | null;
  message: string | null;
};

export type ConnectorClientOptions = {
  apiUrl: string;
  connectorId: string;
  token: string;
};

export class ConnectorControlPlaneClient {
  constructor(private readonly options: ConnectorClientOptions) {
    assertAllowedControlPlaneUrl(options.apiUrl);
  }

  authorizationHeader(): string {
    return connectorAuthorizationHeader(this.options.token);
  }

  async heartbeat() {
    await withTimeout(
      fetch(`${this.options.apiUrl}/api/v1/connectors/${this.options.connectorId}/heartbeat`, {
        method: "POST",
        headers: {
          Authorization: this.authorizationHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectorVersion: "0.1.0",
          observedAt: new Date().toISOString(),
        }),
      }).catch(() => undefined),
      connectorTimeouts.heartbeatMs,
      "Connector heartbeat timed out.",
    );
    return {
      connectorVersion: "0.1.0",
      observedAt: new Date().toISOString(),
    };
  }

  async nextCommand(waitSeconds = 25): Promise<CommandEnvelope | null> {
    boundedTimeoutMs(waitSeconds * 1_000, connectorTimeouts.longPollMs);
    const response = await withTimeout(
      fetch(
        `${this.options.apiUrl}/api/v1/connectors/${this.options.connectorId}/commands/next?waitSeconds=${waitSeconds}`,
        { headers: { Authorization: this.authorizationHeader() } },
      ).catch(() => undefined),
      connectorTimeouts.longPollMs,
      "Connector long-poll timed out.",
    );
    if (!response || !response.ok) {
      return null;
    }
    return (await response.json()) as CommandEnvelope | null;
  }

  async reportResult(commandId: string, result: CommandResult): Promise<void> {
    await fetch(
      `${this.options.apiUrl}/api/v1/connectors/${this.options.connectorId}/commands/${commandId}/result`,
      {
        method: "POST",
        headers: {
          Authorization: this.authorizationHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      },
    ).catch(() => undefined);
  }
}
