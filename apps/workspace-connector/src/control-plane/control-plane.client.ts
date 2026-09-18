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
      Promise.resolve(),
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
    return null;
  }

  async reportResult(commandId: string, result: CommandResult): Promise<void> {
    void commandId;
    void result;
    return undefined;
  }
}
