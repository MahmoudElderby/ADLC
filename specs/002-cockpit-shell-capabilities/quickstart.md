# Quickstart Validation Guide

This guide validates slice 002 in a running system. It is not an implementation tutorial. Follow `demo.md` for the reviewer click path. This file records how to stand the stack up and which automated commands must pass without intercepted requests or substituted storage.

## Prerequisites

- Node.js 24 LTS with Corepack and pnpm
- Docker, with PostgreSQL from the repository Compose file
- Operator credentials from deployment env (`ADLC_OPERATOR_EMAIL`, `ADLC_OPERATOR_PASSWORD`)
- A workspace connector host that can reach the API and, for MCP steps, the test MCP server
- `SECRET_ENCRYPTION_KEY` of at least 32 bytes (a documented local default is acceptable only in development)
- `ADLC_CONNECTOR_TOKEN` or a registration secret matching the hashed connector row

Do not configure OpenAI keys for this slice. Session execution is out of scope.

For demo.md part 3, also have an MCP address reachable from the connector network and not from the API network, plus its credential.

## Start the Local Stack

```powershell
corepack enable
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Expected processes:

- Web UI on the Vite URL, proxied to the API so `adlc_session` is same-origin
- API under `/api/v1`
- PostgreSQL accepting the migrated schema including 002 identity, reachability, and environment-check tables
- Workspace connector looping on heartbeat and `checks/next` (not executor commands)
- Vite same-origin `/api` proxy so `adlc_session` is first-party

Confirm `GET /health` is unauthenticated and `GET /api/v1/capabilities/skills` without a cookie returns 401 with no skill data.

## Operator Sign-In

Open the app signed out. Sign in with the pre-provisioned operator. The shell must show identity, Skills, MCP Servers, entity column, main workspace, and empty assistant panel. Sign-out must revoke the cookie.

## Capability Path

1. Create a skill from the entity column creation workspace (no modal). Leave a required field empty; save is blocked. Fill it; live validation and preview update; save persists.
2. Restart the API process only. Sign in again. The skill and both audit entries (if an edit was made) are unchanged.
3. Register an MCP with a write-once credential. Reachability is measured by the connector. Inspect UI and network responses for the secret; it must not appear. Inspect `workspace_secrets.encrypted_value`; it must not be plaintext.
4. Stop the connector. Register another MCP. Reachability is `unverified`, not guessed.
5. Using the seeded published-agent fixture from test/demo setup, attempt to delete a referenced capability; it is refused and the agent is named.

## Demo step 19 — inspect the stored secret

```sql
SELECT id, fingerprint, left(encrypted_value, 32)
FROM workspace_secrets
WHERE type = 'mcp_credential'
ORDER BY created_at DESC
LIMIT 5;
```

`encrypted_value` must not equal the pasted credential. `fingerprint` is a non-reversible identifier.

## Demo step 23a — attach the saved MCP to the seeded published agent

There is no Agent Registry UI in this slice. After the MCP from demo step 16 exists, attach it with SQL (or `attachCapabilityToSeededAgent` from `@adlc/test-support` in automated tests):

```sql
INSERT INTO agent_capability_attachments (agent_version_id, capability_type, capability_id, required)
SELECT a.current_published_version_id, 'mcp_server', m.id, true
FROM agents a
JOIN mcp_servers m ON m.workspace_id = a.workspace_id
WHERE a.name = 'Seeded published agent'
  AND m.label = '<label-from-step-16>';
```

Then attempt delete in the UI (demo step 24). The UI must name the seeded published agent and leave the MCP in place.

## Automated Validation

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:contract
pnpm exec playwright test --project=cockpit-002
```

`tests/e2e/cockpit-capabilities.spec.ts` is the Principle VI path. It must:

- drive the real browser against the real API and real database
- use `credentials` / the real cookie
- forbid `page.route` intercepts of `/api/`
- restart the API (or otherwise drop in-memory state) and still see the skill
- assert credential values are absent from response bodies

Existing spec 001 Playwright files are not evidence for this feature.

Contract tests cover `contracts/openapi.yaml` over HTTP, including 401 on missing session and 409 on duplicate MCP labels.

Integration tests cover append-only `audit_log` (UPDATE/DELETE raise), encrypted secrets at rest, connector-offline → unverified, and API-does-not-fetch-MCP (the test MCP is reachable only from the connector network).

## Expected Outcomes

- SC-001 path completable in 5 minutes by a new operator
- SC-002 / demo step 15: restart preserves skills, MCP records, and audit
- SC-003: secret scan of browser-visible payloads is clean
- SC-004: audit actors are `workspace_users` ids, not header values
- SC-005: signed-out deep links disclose nothing
- SC-006: audit mutation attempts fail
- SC-010: the Playwright file above is green without mocks
- SC-012: connector-network MCP is reachable; API-only MCP is not reported reachable; offline connector yields unverified
