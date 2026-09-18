# Phase 6 Verification

Date: 2026-09-18

The commands below were run from the repository root. Results are recorded as executed; the live smoke remains opt-in.

| Check | Result |
|---|---|
| Focused API Phase 6 tests | PASS, 6 tests |
| Connector protocol test | PASS, 3 tests |
| API, connector, and web typechecks | PASS, `pnpm typecheck` |
| Repository format | PASS, `pnpm format` after `pnpm format:write` |
| Repository lint | PASS |
| Unit/integration/contract suite | PASS, 35 passed, 1 opt-in smoke skipped |
| Playwright suite | PASS, 5 Chromium tests |
| Migration verification | PASS, existing migration chain applied and rerun successfully |
| Migration application | PASS, PostgreSQL 17 container healthy and migrations applied successfully |
| OpenAPI lint | PASS, 0 errors and 51 existing warnings |
| Live OpenAI + VPN MCP smoke | SKIPPED, requires `ADLC_LIVE_SMOKE=1` and dedicated credentials |

`git diff --check` also passed. The final Phase 6 checkpoint is ready for orchestrator review; the only intentionally skipped check is the credentialed live smoke test.

## Product Owner Caveat (added 2026-09-18)

Phase 6 is not feature acceptance. The PASS results above are real but
mock-backed, and they do not demonstrate the product contract end to end:

- Integration tests instantiate services directly against in-memory stores; no
  test crosses the real HTTP boundary, and `DatabaseModule` is not wired into
  `AppModule`, so no assertion touches PostgreSQL at runtime.
- Playwright tests mock the API. They pass despite `apps/web/src/lib/api.ts`
  omitting the `x-adlc-workspace-id` and `x-adlc-actor-id` headers that the
  global `WorkspaceUserGuard` requires, meaning every API-backed page would
  return 401 against the real API.
- The OpenAI adapters return synthetic identifiers and never make an outbound
  call, so FR-011 through FR-014 are unverified against the real substrate.
- Secret redaction (FR-024, SC-006) is verified only against fakes while
  T089 leaves runtime and MCP secrets in plaintext maps.

Seventeen convergence tasks (T089-T105) remain open. Acceptance for this feature
is deferred to specs 003, 004, and 009 per `docs/09-product-gap-assessment.md`.
