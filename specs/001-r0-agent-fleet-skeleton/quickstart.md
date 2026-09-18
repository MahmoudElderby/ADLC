# Quickstart Validation Guide

This guide validates the implemented walking skeleton. It is not an implementation tutorial.

## Prerequisites

- Node.js 24 LTS with Corepack and pnpm
- Docker with PostgreSQL available through the repository's Compose configuration
- An OpenAI project and application API key with the required Agents API permissions
- A restricted OpenAI executor key for `codex exec-server`
- A self-hosted workspace machine with the Codex CLI installed
- VPN connectivity from that workspace to a test HTTP MCP server
- One existing skill ID or source reference compatible with a self-hosted environment

Keep application and executor credentials separate. The application API key remains in the API process; the restricted executor key exists only on the workspace connector host.

## Start the Local Stack

```powershell
corepack enable
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

For a fresh checkout, run the local validation commands before starting the stack:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm lint:openapi
```

Expected services:

- Web UI on the configured Vite development URL
- API under `/api/v1`
- PostgreSQL health check passing
- API worker consuming session lifecycle jobs

## Start the Workspace Connector

On the VPN-connected workspace host, configure:

```text
ADLC_API_URL=<control-plane URL>
ADLC_CONNECTOR_TOKEN=<one-time connector credential>
ADLC_WORKSPACE_PATH=<approved absolute workspace path>
OPENAI_EXECUTOR_API_KEY=<restricted environment key>
```

Then run:

```powershell
pnpm --filter @adlc/workspace-connector start
```

The connector requires HTTPS for a non-local control-plane URL, a token of at least 24 characters, and a pre-approved workspace path. API requests and connector polling use bounded timeouts.

In Workspace Environment, confirm:

- connector status is online
- the workspace path is readable and writable
- the official Codex executor is available
- the API key is shown only by health/fingerprint, never by value

## Run Automated Validation

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:contract
pnpm test:e2e
```

The normal suite uses OpenAI and MCP fakes. To run the opt-in live contract smoke test with dedicated non-production credentials:

```powershell
pnpm test:smoke:openai
```

The live smoke test is opt-in and requires `ADLC_LIVE_SMOKE=1`, `OPENAI_API_KEY`, `ADLC_MCP_URL`, and `ADLC_SMOKE_ARTIFACT_PATH` ending in `.md`. It is never part of the default test suite.

## Validate the Golden Path

1. Open **Skills** and register the existing skill reference and version. Validate it and confirm status becomes `valid`.
2. Open **MCP Servers** and register the VPN-only HTTP server. Set connection origin to the self-hosted workspace, choose an explicit allowed-tool list, attach a credential reference, and validate it.
3. Disconnect the VPN briefly and revalidate the MCP. Confirm status becomes `unreachable` with no credential data in the response. Restore the VPN and return it to `valid`.
4. Open **Agents**, create a draft, attach the skill and MCP, use **Always allow**, review the redacted configuration, and publish.
5. Open **Sessions**, choose the published agent, and start a task that calls the MCP and writes `artifacts/walking-skeleton.md` inside the workspace.
6. While the run is active, open **Command Center**. Confirm the session appears with the agent name, lifecycle state, skill count, MCP count, and latest safe summary.
7. Open the active session from Command Center. Confirm streamed events continue after a browser refresh and no duplicate events appear.
8. When the session completes, confirm it disappears from the live fleet canvas and remains in session history.
9. Inspect the session trace, redacted effective snapshot, tool call, artifact report, and audit history.
10. Run a second task that reports the same Markdown path. Confirm a second artifact record is created because artifact identity is the report occurrence.

## Expected Evidence

- Capability registration and validation audit entries
- Agent draft, attachment, and publication audit entries
- Immutable published agent version and OpenAI agent ID
- Session states `creating -> provisioning -> running -> completed`
- Raw and normalized events with stable local sequence numbers
- MCP tool activity without an approval request
- One artifact row per distinct report event, with a workspace-relative `.md` path
- Redacted session snapshot identifying skill version, MCP definition, workspace, and Always allow mode
- No completed session on the live Command Center canvas

## Failure Scenarios

### Disconnected Connector

Stop the workspace connector and attempt to start a session. The request must fail readiness or remain in provisioning only until the bounded connection window expires; it must not claim execution started.

### Interrupted Executor

Terminate `codex exec-server` during a run. After reconciliation, the session must become `interrupted`, leave the live canvas, and retain all earlier events and audit evidence.

### User Cancellation

Cancel a running session. The session must become `canceled`, remain terminal despite late upstream events, and retain the cancellation actor and outcome.

### Invalid Artifact

Report a path outside the approved workspace or a non-Markdown file. The artifact report must be retained with `outside_workspace` or `invalid_type`; the session record must remain inspectable.

### Secret Redaction

Seed fake API keys and MCP tokens into upstream error payloads. Contract and integration tests must prove the known values never appear in API responses, SSE events, snapshots, trace records, artifact metadata, audit entries, or logs.

## Contract References

- HTTP API: [contracts/openapi.yaml](./contracts/openapi.yaml)
- Session stream: [contracts/sse-events.md](./contracts/sse-events.md)
- Workspace connector: [contracts/connector-protocol.md](./contracts/connector-protocol.md)
- Persistence and state transitions: [data-model.md](./data-model.md)

## Cleanup

Stop development processes with `Ctrl+C`, then remove only the local PostgreSQL service and its named volume when the validation data is disposable:

```powershell
docker compose down -v
```

To rerun migrations against a clean database, start PostgreSQL again and run `pnpm db:migrate`. Do not use this cleanup command against a shared or production Compose project.
