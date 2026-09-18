# Implementation Plan: Cockpit Shell and the Capability Registry, For Real

**Branch**: `002-cockpit-shell-capabilities` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-cockpit-shell-capabilities/spec.md`

## Summary

Deliver the first operable ADLC increment: the sliced workspace shell from `docs/07-frontend-ui-guidelines.md`, a platform-established operator session (replacing trusted headers), and one complete entity family — skills and environment-origin MCP servers — persisted in PostgreSQL with encrypted credentials, append-only audit, and reachability measured by the workspace connector.

The shell is not shipped as chrome around placeholders. Skills and MCP registration consume identity, storage, audit, and the UI contract in the same release. Agent execution, OpenAI, session streaming, and the Agent Registry UI stay out of scope. Connector work is limited to registration, check-in, and answering platform-issued reachability/health checks.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS; React 19.x for the browser client

**Primary Dependencies**: pnpm workspaces, NestJS with Fastify adapter, React, Vite, TanStack Query, Zustand, Tailwind CSS, Radix UI, Zod, Drizzle ORM, PostgreSQL driver, Argon2id password hashing. OpenAI SDK is present in the repo and is **not** used by this slice.

**Storage**: PostgreSQL 17+ for users, sessions, skills, MCP servers, encrypted secrets, environment checks, connectors, and append-only audit. Secret envelopes use AES-256-GCM via `SecretVaultService`.

**Testing**: Vitest for unit tests, PostgreSQL-backed integration tests, HTTP contract tests against `contracts/openapi.yaml`, Playwright for the real browser → real API → real database golden path (no route intercepts). Connector and a test MCP server run on a network the API cannot use for SC-012.

**Target Platform**: Linux web/API deployment; modern Chromium, Firefox, and WebKit; customer-controlled Linux, macOS, or Windows/WSL self-hosted workspace used here only as the probe origin.

**Project Type**: Web application with API modular monolith plus a minimal environment-side workspace connector

**Performance Goals**: Live validation visible within 1 second; MCP reachability or timeout within 10 seconds (SC-008); registry/detail reads under 500 ms p95

**Constraints**: One workspace and one pre-provisioned operator; no SSO; no self-service accounts; no trusted identity headers; no secret values in browser or audit; no API-side MCP probing; no executor start/stop; no OpenAI calls; rail contains only working areas; assistant panel is an empty region

**Scale/Scope**: R0 still targets dozens of workspaces later; this slice implements one-operator depth for the shell plus the capability family, absorbing 001 tasks T089, T090, T091, T104, T105, capability halves of T099/T100, and the registration/check-in portion of T096

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Pre-Research | Post-Design | Evidence |
|------|--------------|-------------|----------|
| I. General fleet control plane, not scenario-specific | PASS | PASS | Skills, MCP servers, credentials, audit, and shell areas stay reusable SDLC primitives. No incident-response-specific schema. |
| II. OpenAI-managed execution; no custom agent runtime | PASS | PASS | This slice does not start executors or run sessions. The connector answers typed checks only. OpenAI adapters are untouched. |
| Single workspace-wide self-hosted environment | PASS | PASS | One connector per workspace; no environment selector; connection origin remains `environment`. |
| III. Capabilities registered once and attached by reference | PASS | PASS | Skills and MCP records are independent resources. Agents attach by reference; 002 only enforces the delete guard against existing attachments. |
| IV. Orchestrated sequential workflows | PASS | PASS | Workflows are out of scope; nothing in this design adds agent-to-agent routing. |
| V. Auditable system agents and execution history | PASS | PASS | Every 002 state change appends redacted `audit_log` rows. The existing mutation trigger remains the append-only gate. No Platform Chat agent is introduced. |
| **VI. Vertical slice delivery** | PASS | PASS | See below. |
| **VII. Binding visual design system** | n/a at specify | PASS (amended 2026-09-19) | `contracts/ui-shell.md` now binds `@adlc/ui` to `DESIGN_SYSTEM.md` / `DesignSystem.tsx`. Tokens and geometry alone are not compliance. |
| Command Center is operational, not a configuration surface | PASS | PASS | Command Center is not a rail item in this slice. Configuration happens on Skills and MCP creation workspaces. |
| Frontend specs comply with UI guidelines | PASS | PASS | Shell geometry, DesignSystem primitives, status families, typography split, and creation-workspace rules are in `contracts/ui-shell.md`. |
| Secrets never reach the browser or sit in plaintext | PASS | PASS | Write-only `credential`; encrypted at rest; redaction canaries; connector may hold a credential only in memory for a check. |
| Explicit module ownership and service-mediated cross-module writes | PASS | PASS | New identity tables owned by Observability and Governance; checks owned by Workspace Environment; capabilities own skill/MCP rows; delete-guard reads attachments through a port. |
| Required integration, UI, and real-boundary test depth | PASS | PASS | HTTP contract tests, PostgreSQL integration, and one Playwright path with no intercepts are specified in Testing Strategy and `quickstart.md`. |
| Demo script exists at specification time | PASS | PASS | `demo.md` was written with the spec. Quickstart maps it onto the running stack. |

### Principle VI — how it passes

Principle VI requires a user-visible increment, including UI, that a reviewer can operate, and forbids acceptance on mocked or substituted boundaries.

- **Visible increment**: Sign-in, shell, Skills, MCP Servers, creation workspaces, attribution, reachability. Enabling work (tokens, `@adlc/ui`, cookie sessions, Drizzle wiring, connector check-in) is consumed by User Stories 2 and 3 in this same release.
- **Real persistence**: Skills, MCP, secrets, users, sessions, checks, and audit are proven against PostgreSQL, including after API restart (demo step 15 / SC-002).
- **Real HTTP**: Contract and Playwright tests use the API process, not directly instantiated services as the only evidence.
- **Real UI**: Playwright drives the browser with no `page.route` intercepts of `/api/`. Spec 001 e2e tests are explicitly not 002 evidence.
- **Substitutes disclosed**: CI uses a test MCP and compose networks rather than a customer VPN. The VPN-only server in SC-012 remains a `demo.md` step. That disclosure is required and does not let the golden path pass against mocks.

No constitutional violations require justification. Scope is large by design (`docs/09-product-gap-assessment.md` rejected a shell-only spec). Delivery risk is recorded in Design Notes, not as a gate failure.

## Project Structure

### Documentation (this feature)

```text
specs/002-cockpit-shell-capabilities/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── demo.md              # Written at specify time
├── contracts/
│   ├── openapi.yaml
│   ├── connector-protocol.md
│   └── ui-shell.md
└── tasks.md             # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── capability-registry/
│   │   │   ├── observability-governance/
│   │   │   └── workspace-environment/
│   │   └── platform/{auth,config,database,security}/
│   └── test/{contract,integration}/
├── web/
│   ├── src/
│   │   ├── app-shell/          # shell layout, sign-in gate, router
│   │   ├── features/capabilities/
│   │   └── lib/api.ts          # cookie credentials; no identity headers
│   └── test/
└── workspace-connector/
    ├── src/{control-plane,health,security}/
    └── test/

packages/
├── contracts/           # Zod DTOs aligned to 002 OpenAPI
├── database/            # Drizzle schemas and a new 002 migration
├── test-support/        # Postgres helpers; operator/connector fixtures
└── ui/                  # tokens, shell, status, entity browser, creation workspace

tests/
└── e2e/
    └── cockpit-capabilities.spec.ts   # Principle VI path
```

**Structure Decision**: Keep the 001 pnpm workspace. Do not add a new deployable. Expand `@adlc/ui` from a stub into the shell primitive package. Identity lives under `platform/auth` plus Observability-owned tables, not a ninth domain module.

## Design Overview

### Module Responsibilities (002 slice)

- **Platform auth**: Cookie session guard, sign-in/out, public-route exceptions. Derives workspace and actor from `authenticated_sessions`. Ignores client identity headers.
- **Observability and Governance**: `workspace_users`, `authenticated_sessions`, `workspace_secrets` encryption, `audit_log` append/select.
- **Capability Registry**: Skill and MCP CRUD, live draft validation, uniqueness, optimistic concurrency, delete-guard via attachment port, redacted DTOs. Issues reachability checks; does not perform them.
- **Workspace Environment Settings**: Connector register/check-in, stale-online detection, `environment_checks` queue, forwarding decrypted MCP credentials only on the connector poll, applying redacted results.
- **Web shell**: `@adlc/ui` layout; Skills and MCP feature pages; assistant empty region; deep links.

### End-to-End Flow

1. Bootstrap inserts one workspace, one operator (Argon2id hash), encryption key material, and optionally a pre-hashed connector token.
2. Browser hits any workspace route without a cookie → sign-in, no entity data.
3. Operator signs in. API sets `adlc_session`. Guard loads the session on later requests.
4. Shell renders Skills by default. Rail has Skills and MCP Servers only.
5. Skill creation workspace validates live, persists through Drizzle, appends audit attributed to the operator. Restarting the API does not drop the row.
6. MCP registration stores an encrypted secret and inserts a pending `environment_checks` row. If the connector is offline, reachability is `unverified` and the record is kept.
7. Connector check-in marks online, polls checks, handshakes from the environment, returns a redacted result. Capability Registry updates `reachability_status`.
8. Delete of a referenced capability is refused with named agents (seeded published agent for demo/tests).

### Internal Service Boundaries

- `CapabilityReadinessPort` remains the read path for later slices; 002 does not expand it into execution.
- `AgentAttachmentQueryPort` (new, read-only) lists agents referencing a capability.
- `EnvironmentProbePort` (Workspace Environment) accepts "please check this MCP id" and returns current reachability, including `unverified`. It is the only production path that talks to the connector about MCP. `ConnectorCommandService` heuristics are removed from that path.
- `SessionEvidencePort` / audit service appends only.

### Identity Details

- Cookie name `adlc_session` (already in 001 OpenAPI).
- Token: 256-bit random, SHA-256 stored.
- Idle 8 hours / absolute 24 hours. **Ratified by product owner 2026-09-18**, chosen so a reviewer working through the 24-step `demo.md` is not signed out mid-walkthrough. Tightening this is an explicit R2 hardening item, not an oversight.
- Vite proxy in development so the cookie is same-site.
- `GET /health` and `POST /auth/sign-in` and connector routes are public or connector-authenticated.

### Connector Details (no executor work)

See `contracts/connector-protocol.md`. 002 loop is heartbeat + `checks/next` + `checks/{id}/result`. FR-022c is enforced by typed check schema and rejection of anything else. 001 `commands/next` is not a 002 deliverable.

## Testing Strategy

- Unit: redaction, password verify, session expiry, status mapping, draft validation, optimistic-concurrency compare, check expiry → unverified.
- Integration (real PostgreSQL): skill/MCP persist across process restart, unique labels, encrypted_value not plaintext, audit trigger rejects UPDATE/DELETE, connector offline → unverified, API process does not HTTP-get the MCP URL, delete-guard with seeded attachment.
- Contract: HTTP against `contracts/openapi.yaml` for auth, capabilities, connector checks, 401 `application/problem+json` with no workspace disclosure.
- Playwright `tests/e2e/cockpit-capabilities.spec.ts` in project `cockpit-002`: real stack (webServer boots web+API+Postgres+connector+test MCPs), no `/api/` intercepts, covers sign-in, shell, skill save, OS-process API restart, MCP secret absence, connector-stop unverified, Streamable HTTP handshake. This is the SC-010 evidence and a CI gate. Completing `verification.md` is a record of that run, not a substitute for it.
- Compose/Testcontainers networks: (A) test MCP the connector can reach and the API cannot; (B) test MCP the API can reach and the connector cannot — must never become `reachable`. VPN-only server remains `demo.md`.
- Spec 001 Playwright files stay in the repo and must not be cited as 002 acceptance.

## Design Notes and Risks

- **Slice size**: Shell + identity + persistence + encrypted secrets + connector checks + real e2e is a large implementation pass. That pairing is the point of `docs/09-product-gap-assessment.md` section 7–8. Implementation must still sequence User Stories P1 → P2 → P3. It is a schedule risk, not a constitution fail.
- **Working tree**: Some files already import `DatabaseModule` and insert skills/audit. That work is not done: identity is still headers, probes are still in-process heuristics, UI is still unstyled. 002 must correct those paths rather than add a second store.
- **Demo step 24**: Requires a published agent reference while Agent Registry UI is out of scope. **Ratified by product owner 2026-09-18 (updated after analyze)**: seed a published agent with **no** attachment so the registry starts empty. After the reviewer (or e2e) has saved a capability, a documented attach command links that row to the seeded agent. The reviewer never touches an agent editor. Pulling an attach/publish UI into 002 was explicitly rejected.
- **MCP handshake**: **Ratified by product owner 2026-09-18**: MCP Streamable HTTP JSON-RPC `initialize` then `tools/list`. Credential is `Authorization: Bearer <credential>`. Query-string auth is forbidden. An HTTP ping MUST NOT count as reachable.
- **T104 `bytea` vs `text`**: Shipping SQL uses `text` for `encrypted_value`. 002 keeps `text` as the opaque envelope and does not migrate to `bytea`.
- **001 leftover command loop**: Must not be used as 002 evidence and must not be the MCP probe channel.

## Complexity Tracking

No constitution violations.
