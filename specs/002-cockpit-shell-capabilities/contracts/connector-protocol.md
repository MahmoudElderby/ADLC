# Connector Protocol — Slice 002 (Registration, Check-In, Typed Checks)

This document **extends** `specs/001-r0-agent-fleet-skeleton/contracts/connector-protocol.md`. Slice 002 implements only the environment participation needed to measure MCP reachability truthfully. It does **not** implement `start_executor` or `stop_executor`. Those remain specified in the 001 protocol for slice 004.

The connector still:

- runs inside the customer-controlled environment
- makes outbound HTTPS requests to ADLC
- does not require an inbound network port
- is not an agent runtime, general shell service, remote terminal, or arbitrary command runner

## Authentication

- Connector registration authenticates with a deployment-time registration secret (`ADLC_CONNECTOR_REGISTRATION_TOKEN` or equivalent).
- Registration issues a one-time bearer token. ADLC stores only its hash on `workspace_connectors.auth_token_hash`.
- Every subsequent connector request uses TLS and `Authorization: Bearer <token>`.
- Connector tokens authorize only `/api/v1/connectors/{connectorId}/*` for one workspace.
- Token rotation revokes the previous token immediately.
- OpenAI application credentials are never sent to the connector.
- MCP credential values may appear **only** in the in-memory body of a claimed `mcp_reachability` check, over TLS, and must not be written to disk, logs, heartbeat payloads, or check results.

## Outbound Request Loop (002)

The connector performs these outbound calls in a loop:

1. `POST /api/v1/connectors/{connectorId}/heartbeat`
2. `GET /api/v1/connectors/{connectorId}/checks/next?waitSeconds=25`

And when a check is claimed:

3. `POST /api/v1/connectors/{connectorId}/checks/{checkId}/result`

The connector **must not** poll or honor `/commands/next` as part of this feature. If that 001 endpoint exists, 002 neither enqueues executor commands nor treats command-loop success as acceptance evidence.

## Registration

`POST /api/v1/connectors/register`

Request:

```json
{
  "name": "self-hosted-connector",
  "hostFingerprint": "non-secret-stable-fingerprint",
  "connectorVersion": "0.1.0",
  "platform": "windows-wsl",
  "workspacePath": "/approved/absolute/path"
}
```

Header: `Authorization: Bearer <registration-secret>`.

Response (token shown once):

```json
{
  "connectorId": "uuid",
  "token": "one-time-bearer",
  "workspaceId": "uuid"
}
```

Local development may skip this call by pre-hashing `ADLC_CONNECTOR_TOKEN` into the connector row during bootstrap. Production rotation uses registration.

## Check-In (Heartbeat)

Request body matches the 001 heartbeat schema (version, host fingerprint, platform, workspace readable/writable, observedAt). `activeExecutors` may be `0` in this slice.

The response may request revalidation or token rotation. It **cannot** carry executable content, MCP credentials, or command payloads.

A check-in older than 30 seconds marks the connector `offline`. While offline, the control plane must not invent MCP reachability; new and revalidated MCP records become `unverified`.

## Typed Environment Checks

The control plane requests health operations through dedicated check endpoints, not generic commands.

### `mcp_reachability`

Poll response:

```json
{
  "checkId": "uuid",
  "type": "mcp_reachability",
  "mcpId": "uuid",
  "serverUrl": "https://mcp.internal.example/sse",
  "allowedTools": ["search"],
  "credential": "in-memory-only-or-null",
  "expiresAt": "2026-09-18T12:00:10.000Z"
}
```

The connector performs an **MCP Streamable HTTP** handshake from the environment
network (**product owner ratification 2026-09-18**). A TCP/HTTP 200 ping is not
a handshake and MUST NOT be treated as `reachable`.

Handshake sequence:

1. `POST {serverUrl}` with `Content-Type: application/json`,
   `Accept: application/json, text/event-stream`, and
   `Authorization: Bearer <credential>` (**credential presentation ratified
   2026-09-18**; query-string auth is forbidden; structured header-name+value
   blobs are deferred).
2. JSON-RPC `initialize` (protocol version `2025-03-26` or the version the
   test MCP advertises).
3. JSON-RPC `tools/list`.
4. Discard the credential from memory. Do not persist session ids beyond the
   check.

Outcome mapping:

| What happened | `handshake` | `allowedToolsPresent` | `reachability` |
|---|---|---|---|
| `initialize` succeeds and `tools/list` includes ≥1 configured allowed tool | `accepted` | `true` | `reachable` |
| `initialize` succeeds and `tools/list` includes none of the allowed tools | `accepted` | `false` | `unreachable` |
| HTTP 401/403 or MCP error that is an auth failure | `rejected` | `false` | `unreachable` |
| Connection failure, timeout, or non-MCP HTTP response | `not_attempted` or `rejected` | `false` | `unreachable` |

The connector:

- uses `credential` only in memory, then discards it
- returns reachability, handshake, whether the server advertised at least one allowed tool, and a **redacted** error summary
- never returns response bodies, headers that look like secrets, directory listings, or the credential

Result:

```json
{
  "status": "answered",
  "reachability": "reachable",
  "handshake": "accepted",
  "allowedToolsPresent": true,
  "observedAt": "2026-09-18T12:00:03.000Z",
  "errorCode": null,
  "message": null
}
```

`reachability` is `reachable` or `unreachable`. Platform maps unanswered/expired checks to `unverified`.

### `environment_health`

Reports connector-local filesystem readable/writable against the approved workspace path and whether the process can make outbound HTTP. It does not start an executor and does not inspect artifact files.

## Rejection Rules (FR-022c)

The connector must reject:

- check types other than `mcp_reachability` and `environment_health`
- checks whose `checkId` was not returned by the platform poll
- expired checks
- payloads with unrecognized fields that look like shell/exec/start/stop instructions
- any attempt to treat a check as an arbitrary command

Late results for expired checks are accepted as evidence only if the platform still has the row; they must not change a capability that has already been marked `unverified` for that check id after expiry, unless a **new** check was issued.

## Audit Boundary

ADLC audits check creation and final outcome. The connector's local logs may include check id, MCP id, state, and redacted errors. They must never include bearer tokens, registration secrets, MCP credentials, or handshake bodies.
