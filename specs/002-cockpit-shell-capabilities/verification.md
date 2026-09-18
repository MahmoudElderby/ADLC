# Phase 6 Verification

Date: 2026-09-18

The commands below were run from the repository root after User Stories 1–3 and Polish T083–T092. Results are recorded as executed. The live OpenAI smoke remains opt-in and is not a 002 gate.

| Check | Result |
|---|---|
| `pnpm lint` | PASS, exit 0 |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm test` (unit/workspace Vitest) | PASS, 76 passed, 1 opt-in smoke skipped |
| `pnpm test:integration` | PASS, 36 passed |
| `pnpm test:contract` | PASS, 25 passed |
| `pnpm exec playwright test --project=cockpit-002` | PASS, 7 passed (no-api-intercepts setup + 6 cockpit serial tests) |

T093 is recorded as pass because every named command exited 0. This file is a record, not a substitute for CI.

## Notes

- Playwright `cockpit-002` boots web, API, connector, and local Streamable HTTP MCP servers on 127.0.0.1:18080–18082. It does not intercept `/api/`.
- SC-012 case B (API-only MCP never `reachable`) is asserted in PostgreSQL integration tests by forcing the connector offline so the API cannot invent reachability. Compose network isolation of 18081 is the reviewer topology for a live private-net vs API-only split.
- Connector registration tokens are not rewritten on API process restart; the connector re-registers if a heartbeat returns 401.

## Independent verification (2026-09-18)

This section is a later verifier record. It does not change the T093 command table above.

- `tasks.md` has 93 `[X]` and 0 `[ ]`. T004 is checked, but `compose.yaml` does not attach API or connector containers to `api-only` / `connector-only`, and all three MCP services publish host ports (18080–18082). Playwright starts the same servers on `127.0.0.1`. Port 18081 is never registered in tests.
- SC-012 case B automated evidence is the integration test that forces the connector `offline` and asserts the API does not POST to the MCP URL and does not mark the row `reachable`. That is not Compose network isolation of an online connector. Case A in e2e uses `http://127.0.0.1:18080/mcp`, which the API process can also open.
- `WorkspaceUserGuard` derives identity from `adlc_session`. It reads `x-adlc-workspace-id` / `x-adlc-actor-id` only to discard them. `apps/web/src/lib/api.ts` does not send those headers.
- Connector handshake is JSON-RPC POST `initialize` then `tools/list` (`apps/workspace-connector/src/health/mcp-handshake.ts`). The test MCP answers GET/HEAD with HTTP 200 `ok`; that path is not used for `reachable`.
- MCP GET DTOs expose `credentialSecretId` and `credentialHealth`, not the write-once `credential`. `secret-at-rest` checks `workspace_secrets.encrypted_value` is not plaintext.
- Playwright `cockpit-002` `webServer` starts MCP servers, API (`pnpm --filter @adlc/api dev`), web, and connector. It does not start Postgres; CI job `cockpit-002` provides a Postgres service and runs `pnpm exec playwright test --project=cockpit-002` (not a stub). The connector webServer entry has no `port`/`url` wait. No `page.route` of `/api/` in `cockpit-capabilities.spec.ts`.
- Independent re-run: `pnpm test:contract` 25 passed; `pnpm test:integration` 36 passed (includes OS-process skill restart). `pnpm exec playwright test --project=cockpit-002` failed once on demo 9–15 (`replaceApiProcessOnPort` / API did not listen on 3000 after kill) and passed on retry (7 passed). Demo 15 therefore exists on the real stack but the Windows restart helper is not first-try reliable in this environment.

## Product owner acceptance (2026-09-18)

**Accepted as Done with caveats.** SC-012 case B is defined for this slice as: the API never invents `reachable` when the connector is offline and never HTTP-probes the MCP URL. Compose isolation of port 18081 is **not** 002 evidence. A later slice may add a real network-split proof; that is not a reopen of 002.

Also accepted as recorded caveats: demo 15 restart helper can flake on Windows (`tsx watch` after kill); demo 16 proves the handshake path, not “API cannot open the URL.”
