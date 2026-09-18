# Workspace Connector Protocol

## Purpose

The workspace connector runs inside the customer-controlled environment and makes outbound HTTPS requests to ADLC. It validates local workspace conditions and starts or stops only the official `codex exec-server` process for sessions authorized by the control plane.

It is not an agent runtime, general shell service, remote terminal, or arbitrary command runner.

## Authentication

- Connector registration issues a one-time bearer token whose hash is stored by ADLC.
- Every connector request uses TLS and the bearer token.
- Token rotation revokes the previous token immediately.
- Connector tokens authorize only connector endpoints for one workspace.
- OpenAI application credentials are never sent to the connector.
- The restricted OpenAI executor key is configured locally as `OPENAI_EXECUTOR_API_KEY` and is never returned to ADLC.

## Outbound Request Loop

The connector performs these outbound calls:

1. `POST /api/v1/connectors/{connectorId}/heartbeat`
2. `GET /api/v1/connectors/{connectorId}/commands/next?waitSeconds=25`
3. `POST /api/v1/connectors/{connectorId}/commands/{commandId}/result`

The connector does not require an inbound network port.

## Heartbeat

Request:

```json
{
  "connectorVersion": "0.1.0",
  "hostFingerprint": "non-secret-stable-fingerprint",
  "platform": "windows-wsl",
  "codexCliVersion": "x.y.z",
  "workspace": {
    "readable": true,
    "writable": true
  },
  "activeExecutors": 1,
  "observedAt": "2026-09-18T12:00:00.000Z"
}
```

The response may request immediate revalidation or token rotation, but cannot carry executable content.

## Commands

Only two command types are accepted.

### `start_executor`

```json
{
  "commandId": "uuid",
  "type": "start_executor",
  "sessionId": "uuid",
  "environmentId": "openai-environment-id",
  "remoteUrl": "wss://openai-provided-session-url",
  "workspacePath": "configured-approved-absolute-path",
  "expiresAt": "2026-09-18T12:05:00.000Z"
}
```

Validation before launch:

- command and session IDs have not already succeeded
- command has not expired
- `workspacePath` exactly matches the locally approved path
- `remoteUrl` is a valid OpenAI-provided secure WebSocket URL
- the environment ID is present
- no unrecognized arguments or environment variables exist
- the configured Codex CLI version is compatible

The connector constructs the fixed process invocation itself:

```text
codex exec-server --remote <remoteUrl> --environment-id <environmentId>
```

The control plane cannot alter the executable, add flags, provide a working directory outside the approved workspace, or inject environment variables.

### `stop_executor`

```json
{
  "commandId": "uuid",
  "type": "stop_executor",
  "sessionId": "uuid",
  "reason": "session_canceled",
  "expiresAt": "2026-09-18T12:05:00.000Z"
}
```

The connector may stop only the process already mapped to the specified ADLC session.

## Command Result

```json
{
  "status": "succeeded",
  "executorStatus": "connected",
  "observedAt": "2026-09-18T12:00:03.000Z",
  "errorCode": null,
  "message": null
}
```

Valid command statuses are `succeeded` and `failed`. Messages are redacted locally before transmission.

## MCP and Artifact Probes

The control plane may request two typed health operations through dedicated endpoints, not generic commands:

- An MCP reachability probe accepts a registered MCP ID and a server URL already approved for that workspace. It returns reachability, handshake status, and a redacted error summary.
- An artifact validation probe accepts a session ID and workspace-relative path. It resolves the path against the approved root and returns `valid`, `missing`, `unreadable`, `outside_workspace`, or `invalid_type`.

Neither probe returns file contents, directory listings, response bodies, credentials, or arbitrary network results.

## Idempotency and Recovery

- `commandId` is the idempotency key.
- A repeated successful start command returns the existing executor state and does not launch a second process.
- Connector restart rebuilds its session-to-process map from locally persisted non-secret process metadata and reports reconciliation in the next heartbeat.
- If process state cannot be reconciled, the result is failed and Session Runner decides whether the session becomes interrupted.
- Remote URLs are held only in memory or encrypted local transient storage and are deleted when reconnection is no longer possible.

## Audit Boundary

ADLC audits command creation and final outcome. The connector records local operational logs with command ID, session ID, state, and redacted errors only. It never logs remote URLs, bearer tokens, executor keys, MCP credentials, or artifact contents.

