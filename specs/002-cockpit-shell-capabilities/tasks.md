# Tasks: Cockpit Shell and the Capability Registry, For Real

**Input**: Design documents from `/specs/002-cockpit-shell-capabilities/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `demo.md`

**Tests**: Tests are required. Constitution v1.2.0 Principles VI–VII and SC-010 forbid accepting this slice on mocks, in-memory substitutes, or intercepted Playwright routes, and forbid treating unused CSS tokens as visual compliance. Within each story, create the listed tests first and confirm they fail for the expected missing behavior before implementing that story.

**Organization**: Tasks are grouped by user story so each story can be implemented and demonstrated independently. User Story 1 is the identity-and-shell MVP; the complete 002 increment requires all three stories plus the Principle VI evidence in Phase 6.

**Codebase baseline (commit `9f47f5a`)**: Persistence is partially wired (`AppModule` already imports `DatabaseModule` and `PlatformSecurityModule`). Do **not** recreate files that already exist — correct, complete, or replace them. Explicit current state:

- `CapabilityRegistryService`, `AuditRepository`, and `WorkspaceEnvironmentService` already use Drizzle, **not** process `Map`/`Array` stores. Remaining gaps are identity, CRUD completeness, secrets, and probes.
- `WorkspaceUserGuard` still trusts `x-adlc-workspace-id` / `x-adlc-actor-id`. `apps/web/src/lib/api.ts` **does** send those headers from Zustand defaults (`00000000-0000-4000-8000-000000000001` / `...0002`).
- `WorkspaceBootstrap.ensureWorkspace` still creates a workspace from a client-supplied ID and marks the connector `online` immediately.
- MCP "reachability" still runs in-process via `ConnectorCommandService` → `probeMcpReachability` (`url.hostname.includes("unreachable")`).
- `forceMcpStatus` already lives in `apps/api/test/integration/support/us2-fixtures.ts` (001 T105 is done).
- `packages/ui` still exports only `uiPackageName`. `apps/web` has no CSS, no `vite.config.ts`, and no sliced shell. Router still lands on `/command-center`.
- `apps/workspace-connector/src/main.ts` loops heartbeat plus **executor** `commands/next`, not typed environment checks.
- Existing `tests/e2e/*.spec.ts` intercept `/api/` and are **not** 002 evidence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be implemented in parallel because it changes different files and has no unmet dependency on another task in the same group.
- **[Story]**: Maps the task to User Story 1, 2, or 3.
- Every task names the exact file or directory it changes.
- FR-* and demo.md step numbers in a task are traceability, not optional extras.

## Path Conventions

- API: `apps/api/src/`, tests in `apps/api/test/{contract,integration,unit}/`
- Web: `apps/web/src/`
- Connector: `apps/workspace-connector/src/`
- Shared: `packages/{contracts,database,test-support,ui}/`
- Principle VI browser path: `tests/e2e/cockpit-capabilities.spec.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the 002 dependencies, local config, proxy, and isolated test-MCP topology on top of the existing pnpm workspace. Do not scaffold new apps.

- [X] T001 Add operator, session, and connector deployment variables (`ADLC_OPERATOR_EMAIL`, `ADLC_OPERATOR_PASSWORD`, `ADLC_WORKSPACE_NAME`, `ADLC_CONNECTOR_REGISTRATION_TOKEN`, `ADLC_CONNECTOR_TOKEN`, idle 8h / absolute 24h session lifetimes) to `./.env.example`, `apps/workspace-connector/.env.example`, and `apps/api/src/platform/config/config.ts` (FR-003, FR-004; demo Before you start)
- [X] T002 [P] Add Tailwind CSS, Radix UI, `argon2`, and `@fastify/cookie` to `./pnpm-workspace.yaml` catalog and to `apps/api/package.json`, `apps/web/package.json`, and `packages/ui/package.json` (plan Technical Context)
- [X] T003 [P] Create the missing Vite config with React plugin and a same-origin `/api` → API proxy so `adlc_session` is first-party in `apps/web/vite.config.ts` (referenced by `apps/web/tsconfig.json` but the file does not exist)
- [X] T004 [P] Add Compose/Testcontainers topology in `./compose.yaml` and `packages/test-support/src/test-mcp-server.ts`: (A) a Streamable HTTP MCP the connector can reach and the API cannot; (B) a Streamable HTTP MCP the API can reach and the connector cannot; (C) a Streamable HTTP MCP that initializes but advertises none of the allowed tools. Dummy HTTP 200 servers are forbidden. Covers SC-012 cases A/B and the no-allowed-tools edge (demo steps 16/21/22)
- [X] T005 Add `test:integration` and `test:contract` scripts; point **both** `./package.json` and `packages/contracts/package.json` `lint:openapi` at `specs/002-cockpit-shell-capabilities/contracts/openapi.yaml`; add Playwright project `cockpit-002` with `webServer` that boots web+API+Postgres+connector+test MCPs, `fullyParallel: false` for restart tests, and `testIgnore` for 001 intercepting specs; add a CI job in `.github/workflows/ci.yml` that runs `cockpit-002` and fails the pipeline on non-zero (Principle VI, SC-010; T086/T093)
- [X] T006 [P] Add operator, hashed connector token, and a seeded published-agent helper **with no attachment** in `packages/test-support/src/operator-fixture.ts` and `packages/test-support/src/published-agent-fixture.ts`, plus `attachCapabilityToSeededAgent(...)` used after a capability exists (demo step 24; no agent editor UI)
- [X] T084 Build a test helper that starts, kills, and restarts the **real OS API process** against test Postgres in `packages/test-support/src/api-process.ts`. Nest `TestingModule` re-init is not a restart. Required before T043/T044 (Principle VI, SC-002, SC-010)
- [X] T085 Fail `cockpit-002` if `tests/e2e/cockpit-capabilities.spec.ts` contains `page.route` / `route.fulfill` of `/api/` — Playwright setup hook in `tests/e2e/no-api-intercepts.setup.ts`, not a Vitest file outside the workspace (SC-010)
- [X] T086 Quarantine spec 001 Playwright files with `testIgnore` in default projects in `playwright.config.ts`; 002 gate is project `cockpit-002` running only `cockpit-capabilities.spec.ts`. Default `pnpm test:e2e` MUST NOT run intercepting 001 specs as the 002 gate (Principle VI)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Platform identity tables, cookie-session guard, operator bootstrap, UI tokens/shell primitives, and probe-port seams that every story depends on.

**Critical**: No user story implementation begins until this phase is complete.

- [X] T007 Extend Drizzle schema with `workspace_users` (`email` unique case-insensitive, unique `(workspace_id)` for R0, `display_name` required, `password_hash` Argon2id never selected into product DTOs) and `authenticated_sessions` (`token_hash` unique SHA-256 of cookie token, `status` `active|revoked|expired`, absolute expiry `created_at + 24h`, idle expiry `last_seen_at + 8h`, `expires_at`, `revoked_at` nullable) in `packages/database/src/schema/foundation.ts` (FR-002, FR-003, FR-004)
- [X] T008 [P] Add `environment_checks` (`check_type` `mcp_reachability|environment_health`, `status` `pending|claimed|answered|expired|rejected`, `payload_redacted_json` with MCP id/URL/allowed tools and **no credential**, `expires_at` default 10 seconds) plus indexes `(connector_id, status, requested_at)` and `(target_capability_id, requested_at desc)` in `packages/database/src/schema/foundation.ts` (FR-022a/b/c; absorbs 001 T096 check queue)
- [X] T009 Extend `skills` with required `created_by`/`updated_by` FKs to `workspace_users`, and `mcp_servers` with `reachability_status` `unverified|reachable|unreachable` default `unverified`, `reachability_summary` redacted nullable, `reachability_checked_at` nullable, and `created_by`/`updated_by`; add `unverified` to SQL `validation_status` for compatibility while keeping MCP health on the new reachability column; **keep `workspace_secrets.encrypted_value` as `text` opaque envelope** (001 T104 resolution) in `packages/database/src/schema/capabilities.ts` and `packages/database/src/schema/foundation.ts` (FR-015, FR-022, FR-024)
- [X] T010 Generate migration `packages/database/drizzle/0007_cockpit_identity_capabilities.sql` and export the new tables from `packages/database/src/schema.ts` (FR-024)
- [X] T011 [P] Add/adjust Zod contracts to 002 OpenAPI: new `packages/contracts/src/auth.ts`; extend `packages/contracts/src/capabilities.ts` with write-only `credential` required on register and optional on PATCH (stop using client-supplied `credentialSecretId` as the create path), `reachabilityStatus`, `createdBy`/`lastChangedBy` ActorSummary, `updatedAt` concurrency token; extend `packages/contracts/src/workspace-environment.ts` with `canProbeReachability` (T040 may consume a false/offline value until heartbeat exists); change `packages/contracts/src/observability.ts` `auditEntrySchema` from `actorId` to `actor: { id, displayName }` **and update 001 consumers in the same change** (`apps/api/test/contract/capability-registry.contract.test.ts`, `apps/api/test/contract/command-center-observability.contract.test.ts`, `sessionInvestigationSchema` fixtures) so `pnpm ci` does not go red mid-task; split skill validation vs MCP reachability in `packages/contracts/src/common.ts`; remove unused OpenAPI `POST /capabilities/skills/{skillId}/validate` if live draft is `draft:validate` (FR-019, FR-027, FR-028)
- [X] T012 Rewrite `apps/api/src/platform/auth/workspace-user.guard.ts` so it loads `adlc_session`, hashes the token, loads `authenticated_sessions`, rejects missing/expired/revoked with 401 that discloses no workspace names/lists/fields, derives `workspaceId`/`actorId` from the session row, and **ignores** `x-adlc-workspace-id` / `x-adlc-actor-id` even when present (FR-001, FR-002; demo steps 1, 2, 8)
- [X] T013 Skip the **user-session** guard for `GET /api/v1/health`, `POST /api/v1/auth/sign-in`, and `/api/v1/connectors/*` in `apps/api/src/platform/auth/public.decorator.ts` and the guard. Connector routes MUST still require registration-secret or connector bearer (`requireConnector`). Add a contract assertion that `GET/POST /connectors/*` without a bearer returns 401. Do **not** make connector routes unauthenticated (FR-001, FR-022c)
- [X] T014 Replace `WorkspaceBootstrap.ensureWorkspace(clientWorkspaceId)` in `apps/api/src/platform/database/workspace-bootstrap.ts`: on process start insert exactly one `workspaces` row and one `workspace_users` row from env (Argon2id hash, plaintext never logged); optionally pre-hash `ADLC_CONNECTOR_TOKEN` into `workspace_connectors.auth_token_hash`; connector row starts `offline` with `last_heartbeat_at` null; **stop creating a workspace from a client-supplied ID** (FR-002, FR-003; absorbs 001 T096 registration seed)
- [X] T015 [P] Register `@fastify/cookie` and change CORS to `credentials: true` in `apps/api/src/main.ts` (currently `credentials: false`); set cookie `adlc_session` HttpOnly, `SameSite=Lax`, `Path=/`, `Secure` outside local development in `apps/api/src/platform/http/session-cookie.ts` (FR-002)
- [X] T016 [P] Replace the `@adlc/ui` stub (`packages/ui/src/index.ts` currently exports only `uiPackageName`) with guideline tokens: graphite palette, status families emerald/amber/red/slate only, Inter for human copy, JetBrains Mono for machine metadata, cyan interactive accent, no purple, in `packages/ui/src/tokens.css` and `packages/ui/src/index.ts` (FR-011, FR-012)
- [X] T017 Build shell primitives that match `contracts/ui-shell.md` geometry (top bar 40px, rail 56px, entity column 260px, assistant 320/40/hidden, panel resizes and never overlays) in `packages/ui/src/shell/WorkspaceShell.tsx`, `packages/ui/src/shell/TopBar.tsx`, `packages/ui/src/shell/NavRail.tsx`, `packages/ui/src/shell/EntityColumn.tsx`, `packages/ui/src/shell/AssistantPanel.tsx`, `packages/ui/src/shell/CreationWorkspace.tsx`, and `packages/ui/src/status/StatusBadge.tsx` (FR-006, FR-007, FR-009)
- [X] T018 Introduce `EnvironmentProbePort` in `apps/api/src/modules/workspace-environment/environment-probe.port.ts` that returns current reachability including `unverified` and is the **only** production path that talks to the connector about MCP; stop providing `ConnectorCommandService` from `ObservabilityGovernanceModule` (`apps/api/src/modules/observability-governance/observability-governance.module.ts`) (FR-022a/b; absorbs 001 T099 production-path half)
- [X] T019 Remove hostname-heuristic MCP probing from the capability production path: `CapabilityRegistryService.validateMcp` in `apps/api/src/modules/capability-registry/capability-registry.service.ts` must not call `ConnectorCommandService.validateMcp`; keep `probeMcpReachability` in `apps/workspace-connector/src/health/capability-probes.ts` out of the API process (FR-022a; 001 T105 already moved `forceMcpStatus` to `apps/api/test/integration/support/us2-fixtures.ts` — do not put it back on the production service)
- [X] T020 [P] Add session-policy unit tests for idle 8h, absolute 24h, header ignore, and Argon2 verify in `apps/api/test/unit/session-policy.test.ts` (FR-002, FR-004)
- [X] T021 [P] Add status-family mapping unit tests (`valid+reachable` emerald, `unverified`/offline amber, `invalid`/`unreachable` red; `unverified` is not a new color) in `packages/ui/test/status-mapping.test.ts` (the ui Vitest project includes `packages/ui/test/**`, not `src/**`) (FR-011, research §8)
- [X] T022 Wire `DatabaseModule` on-module-init bootstrap (operator + optional connector hash) so identity exists before the first request, in `apps/api/src/platform/database/database.module.ts` (FR-003)

**Checkpoint**: Cookie sessions, one operator, tokens/shell primitives, and probe-port seams exist. Story work may now proceed. The shell is not yet a product until User Story 1 consumes it.

---

## Phase 3: User Story 1 - Enter the Cockpit as a Known User (Priority: P1) — MVP

**Goal**: A visitor cannot see workspace data. The pre-provisioned operator signs in, lands in the sliced cockpit with Skills and MCP Servers only, can collapse the assistant panel across reload, and signs out.

**Independent Test**: Empty workspace, valid operator credentials: unauthenticated deep link refused; sign-in shows identity and the four shell regions; rail has only Skills and MCP; assistant collapse persists across reload; sign-out refuses the last URL (demo.md steps 1–8).

### Tests for User Story 1

> Write these tests first and verify each fails for the intended missing behavior.

- [X] T023 [P] [US1] Replace the Fastify-stub + trusted-header test in `apps/api/test/contract/http-openapi.contract.test.ts` with Nest HTTP contract tests against `contracts/openapi.yaml` for `POST /auth/sign-in` (204 Set-Cookie, 401 does not disclose whether the email exists), `POST /auth/sign-out`, `GET /auth/me`, `GET /health` unauthenticated, and `GET /capabilities/skills` without a cookie returning 401 with no skill array (FR-001, FR-003; demo steps 1, 8)
- [X] T024 [P] [US1] Add PostgreSQL integration tests that a spoofed `x-adlc-workspace-id`/`x-adlc-actor-id` cannot establish identity, idle and absolute expiry refuse further requests, and sign-out revokes the session row in `apps/api/test/integration/operator-session.test.ts` (FR-002, FR-004; SC-004, SC-005)
- [X] T025 [P] [US1] Add Playwright `tests/e2e/cockpit-capabilities.spec.ts` covering demo steps 1–8 against the real web app, real API, and real database. **Depends on T005/T084/T085**: `webServer` boots the stack; the file MUST NOT use `page.route`/`route.fulfill` on `/api/`; restart tests are serial. Also assert Skills → MCP → Skills in two clicks (FR-001, FR-006, FR-007, FR-010, FR-014; SC-007, SC-010)

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement `AuthService` in `apps/api/src/platform/auth/auth.service.ts`: Argon2id verify against `workspace_users.password_hash`, 256-bit random cookie token with SHA-256 stored, `last_seen_at`/`expires_at` refresh on authenticated use, append `auth.sign_in` / `auth.sign_out` audits, never log plaintext password or raw token (FR-003, FR-004, FR-005)
- [X] T027 [US1] Add `POST /auth/sign-in`, `POST /auth/sign-out`, `GET /auth/me` in `apps/api/src/platform/auth/auth.controller.ts` and `apps/api/src/platform/auth/auth.module.ts`, imported from `apps/api/src/app.module.ts` (FR-003; demo steps 3, 8)
- [X] T028 [US1] Tighten 401 handling in `apps/api/src/platform/http/problem-details.filter.ts` so auth failures use generic problem+json with **no** workspace names, entity lists, or field values (FR-001; resolves plan “empty body” vs OpenAPI problem+json by following the OpenAPI contract without workspace disclosure)
- [X] T029 [US1] Change `apps/web/src/lib/api.ts` to `credentials: "include"` and **remove** `x-adlc-workspace-id` / `x-adlc-actor-id` (they are currently sent from Zustand defaults in `apps/web/src/app-shell/providers.tsx`) (FR-002)
- [X] T030 [US1] Replace Zustand identity defaults in `apps/web/src/app-shell/providers.tsx` with session identity from `GET /auth/me` (FR-002, FR-003)
- [X] T031 [P] [US1] Build `/sign-in` outside the shell, preserve `next` for deep links, disclose no workspace content, in `apps/web/src/features/auth/SignInPage.tsx` (FR-001, FR-010; demo steps 1, 2)
- [X] T032 [US1] Wrap authenticated routes in the `@adlc/ui` shell in `apps/web/src/app-shell/AppShellLayout.tsx` and `apps/web/src/app-shell/AuthGate.tsx`: persistent top bar (operator display name, workspace name, sign-out, environment probe-ability), entity column, main workspace, assistant region (FR-006, FR-003, FR-022b; demo step 3)
- [X] T033 [US1] Replace `apps/web/src/app-shell/router.tsx` (currently `<Navigate to="/command-center">` plus Agents/Sessions/Command Center routes): default landing `/skills`; addressable `/skills`, `/skills/new`, `/skills/:skillId`, `/mcp`, `/mcp/new`, `/mcp/:mcpId`; unauthenticated routes except `/sign-in` go to sign-in with `next` (FR-010, FR-014; demo steps 2, 4, 5)
- [X] T034 [US1] Render a navigation rail with **only** Skills and MCP Servers, in that order; do not render Command Center, Agents, Workflows, Sessions, Approvals, Artifacts, Traces, Settings, or Workspace Environment as rail items in `apps/web/src/app-shell/product-areas.ts` (FR-014; demo step 4)
- [X] T035 [US1] Redirect leftover 001 deep links (`/command-center`, `/agents/*`, `/sessions/*`, `/capabilities`, `/workspace`) through the auth gate to `/skills` so they are not working nav targets, in `apps/web/src/app-shell/router.tsx` (FR-014; `contracts/ui-shell.md`)
- [X] T036 [US1] Implement assistant expanded / collapsed / hidden with `localStorage` persistence across navigation and reload; expanded state resizes main workspace and never overlays it, in `apps/web/src/app-shell/AssistantDock.tsx` (FR-007; demo steps 6, 7)
- [X] T037 [US1] Keep the assistant body an empty operational region (no composer, no fake messages); optional context strip with current area/entity name only, in `apps/web/src/app-shell/AssistantDock.tsx` (spec assumption; slice 007 owns chat)
- [X] T038 [US1] Selecting a rail item must change both the entity column and the main workspace without unmounting the assistant, in `apps/web/src/app-shell/AppShellLayout.tsx` (FR-008; demo step 5)
- [X] T039 [US1] Import `@adlc/ui` tokens from `apps/web/src/main.tsx` and `apps/web/index.html` (Inter + JetBrains Mono) so the shell is not unstyled (FR-006, FR-012)
- [X] T040 [US1] Surface connector probe-ability in the top bar from `GET /workspace-environment/health` (`canProbeReachability` / online vs offline) without exposing connector tokens, in `apps/web/src/app-shell/EnvironmentHealthChip.tsx`. Until T065/T072 complete heartbeat, the chip MUST show offline/unable-to-probe — never stub `true` (FR-022b; demo step 3)
- [X] T041 [US1] Placeholder Skills and MCP list/empty states inside the shell (API-backed lists, no hardcoded `useState` entities) in `apps/web/src/features/capabilities/SkillsPage.tsx` and `apps/web/src/features/capabilities/McpServersPage.tsx` so the rail has working screens before US2/US3 complete CRUD (FR-014, FR-016, FR-023; demo steps 4, 5)

**Checkpoint**: User Story 1 is independently usable. A reviewer can complete demo.md steps 1–8. Identity is a platform fact. Skills/MCP persistence and secrets are not required for this checkpoint.

---

## Phase 4: User Story 2 - Register a Skill That Is Still There Tomorrow (Priority: P2)

**Goal**: Create, validate, edit, and attribute a skill through the creation workspace; survive API restart; show append-only history on the skill itself.

**Independent Test**: Empty registry → creation workspace (no modal) → blocked empty required field → live validation + preview → save → attribution → edit adds a second audit without altering the first → restart API → skill and both entries remain (demo.md steps 9–15).

### Tests for User Story 2

> Write these tests first and verify each fails for the intended missing behavior.

- [X] T042 [P] [US2] Add HTTP contract tests for skill list/register/get/patch/delete, `POST /capabilities/skills/draft:validate`, `GET /capabilities/skills/{skillId}/audit`, 422 blocking errors, 409 name+version uniqueness, and 409 stale `updatedAt` in `apps/api/test/contract/skills.contract.test.ts` (FR-015, FR-016, FR-017, FR-033)
- [X] T043 [P] [US2] Add PostgreSQL integration tests in `apps/api/test/integration/skill-persistence.test.ts`: skill row survives killing and restarting the **OS API process** via `packages/test-support/src/api-process.ts` (T084; a Nest `TestingModule` re-init is not a restart); `(workspace_id, name, version)` uniqueness; `created_by`/`updated_by` are session user ids not header values; `compatible_environment_types_json` must include `self_hosted` or validation is `invalid` with a blocking error and persistence is refused; `audit_log` UPDATE/DELETE raise `audit_log is append-only` (FR-015, FR-024, FR-025, FR-026, FR-032; demo step 15; absorbs 001 T090 evidence + T091 remainder)
- [X] T044 [P] [US2] Extend `tests/e2e/cockpit-capabilities.spec.ts` with demo steps 9–15 including an OS-process API restart against the same Postgres via T084 (serial describe). No `page.route`, no in-memory repository. **T084 is a dependency of this task.** (FR-009, FR-017, FR-018, FR-024, FR-027; SC-002, SC-010)

### Implementation for User Story 2

- [X] T045 [P] [US2] Implement live draft validation (blocking vs warnings, redacted configuration preview, no row required) quoting data-model rules: `name`, `description`, `source_type`, `source_reference`, `version` required; `compatible_environment_types_json` must include `self_hosted` or blocking `invalid`, in `apps/api/src/modules/capability-registry/skill-draft.validator.ts` (FR-017, FR-018; demo steps 10, 11; SC-008 ≤ 1s)
- [X] T046 [US2] Complete skill CRUD on the **existing Drizzle-backed** `apps/api/src/modules/capability-registry/capability-registry.service.ts` (already inserts/selects; **not** a Map): add get/patch/delete, set `created_by`/`updated_by` from the session, refuse save while blocking errors remain, optimistic concurrency on `updated_at` → 409, stop calling `bootstrap.ensureWorkspace(workspaceId)` on register (FR-015, FR-016, FR-024, FR-033; absorbs 001 T091 remainder)
- [X] T047 [US2] Append redacted audits `skill.registered`, `skill.updated`, `skill.removed` attributed to the session user in that service via existing `AuditService` (already Drizzle insert/select — complete action names and actor attribution, do not replace the repository with a Map) (FR-005, FR-025; demo steps 13, 14; absorbs 001 T090 remainder)
- [X] T048 [US2] Add missing skill HTTP routes to `apps/api/src/modules/capability-registry/capability-registry.controller.ts`: `GET/PATCH/DELETE /capabilities/skills/{skillId}`, `POST /capabilities/skills/draft:validate`, `GET /capabilities/skills/{skillId}/audit` (FR-016, FR-017, FR-027)
- [X] T049 [US2] Change audit HTTP DTOs in `apps/api/src/modules/observability-governance/observability.controller.ts` and `apps/api/src/modules/observability-governance/audit.service.ts` to return `actor: { id, displayName }` joined from `workspace_users` (current response is raw `actorId`) (FR-027; demo step 13)
- [X] T050 [P] [US2] Replace combined unstyled `apps/web/src/features/capabilities/CapabilityRegistryPage.tsx` / `CapabilityEditor.tsx` (API plus local `useState` that fakes `status: "valid"`) with Skills entity column, empty state, and `+` opening a creation workspace in the main area — **no modal** — in `apps/web/src/features/capabilities/SkillsPage.tsx` and `apps/web/src/features/capabilities/SkillCreationWorkspace.tsx` (FR-009, FR-016; demo step 9; absorbs 001 T100 capability half)
- [X] T051 [US2] Build skill create/edit main workspace: live validation ≤ 1s distinguishing blocking errors from warnings, configuration preview from current form state (monospace, no secrets), explicit save refused while blocking errors remain, in `apps/web/src/features/capabilities/SkillCreationWorkspace.tsx` and `apps/web/src/features/capabilities/SkillDetailPage.tsx` (FR-017, FR-018; demo steps 10, 11)
- [X] T052 [US2] Show skill status in the entity column using only guideline status families; selecting a row opens `/skills/:skillId`; show who registered/last changed and when from the skill view plus append-only history, in `apps/web/src/features/capabilities/SkillDetailPage.tsx` (FR-008, FR-011, FR-016, FR-027; demo steps 12–14)
- [X] T053 [US2] Keep configuration on the Skills creation/edit workspace in `apps/web/src/features/capabilities/SkillCreationWorkspace.tsx` and `apps/web/src/features/capabilities/SkillDetailPage.tsx`; do not add Command Center as a 002 rail item or configuration surface (FR-013)
- [X] T054 [US2] Scope all skill reads/writes to `RequestContext.workspaceId` from the session; add an integration assertion that another workspace id in the body/query cannot read or mutate the row in `apps/api/test/integration/skill-persistence.test.ts` (FR-032)

**Checkpoint**: User Stories 1 and 2 work independently. Demo.md steps 1–15 are achievable, including restart (the step spec 001 could not pass).

---

## Phase 5: User Story 3 - Register an MCP Server Without Handling Its Secret (Priority: P3)

**Goal**: Register environment-origin HTTP MCP servers with encrypted write-once credentials, unique labels, connector-measured reachability (`reachable` / `unreachable` / `unverified`), secret-free UI, and delete-guard against a seeded published agent.

**Independent Test**: Register a connector-network MCP as reachable via Streamable HTTP; secret absent from DOM, network, and plaintext at rest; duplicate label 409; unreachable address retained unhealthy; stop connector → new MCP `unverified`; restart connector and revalidate; attach the saved MCP to the seeded agent; delete of that capability names the agent (demo.md steps 16–24).

### Tests for User Story 3

> Write these tests first and verify each fails for the intended missing behavior.

- [X] T055 [P] [US3] Add HTTP contract tests for MCP list/register/get/patch/delete, draft validate (schema only, **no** network probe), revalidate, audit, 409 unique label, 409 delete-guard with `referencingAgents`, and connector `POST /connectors/register`, heartbeat, `GET /checks/next`, `POST /checks/{id}/result` in `apps/api/test/contract/mcp-and-connector.contract.test.ts` (FR-019–FR-023, FR-031, FR-022c)
- [X] T056 [P] [US3] Add PostgreSQL integration tests in `apps/api/test/integration/mcp-reachability.test.ts` and `apps/api/test/integration/secret-at-rest.test.ts`: `workspace_secrets.encrypted_value` is not plaintext (absorbs 001 T089 remainder); duplicate `(workspace_id, label)` identified; connector offline or check expiry → `reachability_status = unverified` never guessed; API process does not HTTP-GET MCP URLs; **SC-012 case B**: an MCP reachable only from the API network is never `reachable`; handshake-ok/no-allowed-tools → `unreachable` and the row is kept; unexpected `checkId` stored `rejected`; another workspace cannot list/get/patch/delete the MCP or read its audit (FR-020, FR-022, FR-022a/b/c, FR-029, FR-032; SC-012; demo steps 16, 19, 20, 22)
- [X] T057 [P] [US3] Add delete-guard integration tests that call `attachCapabilityToSeededAgent` **after** creating the capability (agent is seeded with no attachment) in `apps/api/test/integration/capability-delete-guard.test.ts` (FR-031; demo steps 23a, 24)
- [X] T058 [P] [US3] Add connector tests that the 002 loop performs Streamable HTTP `initialize` + `tools/list` (not HTTP ping), answers only `mcp_reachability` and `environment_health`, rejects check types / unrecognized exec/start/stop fields, maps auth failure vs missing allowed tools, redacts errors, and never logs bearer/credential/handshake bodies, in `apps/workspace-connector/test/environment-checks.test.ts` (FR-022c, FR-028, FR-030)
- [X] T059 [P] [US3] Extend `tests/e2e/cockpit-capabilities.spec.ts` with explicit assertions for demo 16 (private-net MCP becomes reachable), 17–18 (secret absent), 20 (duplicate label refused), 21 (unreachable retained unhealthy), 22–23 (stop → unverified, restart + revalidate), 23a (attach helper), 24 (delete-guard names the agent). Step 19 is SQL via T056/T088, not e2e. Real stack, no intercepts (FR-028, FR-022b, FR-031; SC-003, SC-010)

### Implementation for User Story 3

- [X] T060 [US3] Complete 001 T089 for MCP: accept write-only `credential` on register/update in `apps/api/src/modules/capability-registry/capability-registry.service.ts`, encrypt with existing `SecretVaultService` (AES-256-GCM) into `workspace_secrets` type `mcp_credential`, store `credential_secret_id`, register the submitted value as a redaction canary, never select `encrypted_value` into HTTP DTOs; PATCH without `credential` keeps the existing secret; GET/PATCH omit the secret (FR-019, FR-028, FR-029; demo steps 17–19)
- [X] T061 [US3] Complete MCP persistence on the same Drizzle service (already inserts/selects; **not** a Map): get/patch/delete, `connection_origin = environment`, `transport_type = http`, nonempty `allowed_tools`, required flag, unique label 409 identifying the conflict, optimistic `updatedAt` 409; **retain handshake/reachability failures** as unhealthy rows; **do not persist schema-invalid drafts** (FR-017 vs FR-022) (FR-019, FR-020, FR-021, FR-022, FR-033; demo steps 20, 21; absorbs 001 T091 remainder)
- [X] T062 [US3] On MCP save/revalidate, if no connector is `online` (`last_heartbeat_at` null or older than 30 seconds), persist the row with `reachability_status = unverified` and an actionable reason — **do not invent healthy/unhealthy** — in `apps/api/src/modules/workspace-environment/environment-check.service.ts` (FR-022b; demo step 22)
- [X] T063 [US3] When the connector is online, insert `environment_checks` `mcp_reachability` pending with 10s expiry; put decrypted credential **only** on the TLS `checks/next` response body, never in `payload_redacted_json` or audit metadata (FR-022a, FR-028; demo step 16)
- [X] T064 [US3] Implement `POST /connectors/register` (registration secret, one-time bearer, store hash only, rotate revokes previous) on `apps/api/src/modules/workspace-environment/connector.controller.ts` which today has heartbeat + executor `commands/next` only (FR-022c; absorbs 001 T096 registration)
- [X] T065 [US3] Complete heartbeat check-in on that same controller: version, host fingerprint, filesystem flags; mark `online` and `last_heartbeat_at`; response **must not** carry executable payload, MCP credentials, or command payloads; treat heartbeat older than 30s as `offline` in `apps/api/src/modules/workspace-environment/workspace-environment.service.ts` (currently `getHealth` can report healthy from bootstrap JSON and heartbeat immediately sets online) (FR-022b; absorbs 001 T096 check-in remainder)
- [X] T066 [US3] Add `GET /connectors/{id}/checks/next` long-poll and `POST /connectors/{id}/checks/{checkId}/result` on `apps/api/src/modules/workspace-environment/connector.controller.ts`; reject unknown/expired ids (`rejected`); late results must not change a capability already marked `unverified` for that check unless a **new** check was issued; do **not** enqueue or treat `commands/next` as 002 evidence (FR-022c)
- [X] T067 [US3] Map answered checks onto `mcp_servers.reachability_status` / `status` in `apps/api/src/modules/workspace-environment/environment-check.service.ts`: handshake succeeded and at least one allowed tool present → `reachable` + `valid`; failed handshake or none of the allowed tools → `unreachable` (unhealthy, record kept); schema/label/URL errors before a check is issued → validation `invalid`, reachability stays `unverified` (FR-022; demo step 21)
- [X] T068 [US3] Replace the connector process loop in `apps/workspace-connector/src/main.ts` (today: heartbeat + `runCommandLoopOnce` executor commands) with heartbeat + `checks/next` + `checks/{id}/result` in `apps/workspace-connector/src/control-plane/check-loop.ts`; **must not** poll `/commands/next` as part of this feature (FR-022c)
- [X] T069 [US3] Implement MCP Streamable HTTP handshake in `apps/workspace-connector/src/health/mcp-handshake.ts`: JSON-RPC `initialize` then `tools/list`, credential as `Authorization: Bearer <credential>`, then discard it. HTTP ping/GET/HEAD MUST NOT yield `reachable`. Redact errors locally; never return response bodies, secret-like headers, directory listings, or the credential (FR-022a, FR-028, FR-030; demo steps 16, 17; `contracts/connector-protocol.md`)
- [X] T070 [US3] Enforce FR-022c rejection rules in `apps/workspace-connector/src/control-plane/check-loop.ts`: reject check types other than `mcp_reachability`/`environment_health`, checks not returned by poll, expired checks, and payloads with unrecognized shell/exec/start/stop fields
- [X] T071 [US3] Implement `environment_health` checks (filesystem readable/writable against approved workspace path, outbound HTTP possible) without starting an executor or inspecting artifact files, in `apps/workspace-connector/src/health/environment-health.ts` (FR-022b)
- [X] T072 [US3] Complete remaining `GET /workspace-environment/health` fields in `apps/api/src/modules/workspace-environment/workspace-environment.service.ts` after heartbeat (T065): `canProbeReachability` true only when a connector is online; executor availability may be `unknown`; never put secrets in `health_json`. Do not leave T040 stubbed `true` (FR-022b)
- [X] T073 [P] [US3] Add MCP draft validator (label, http/https URL, nonempty allowed tools, origin environment, required flag, credential present on first save) with blocking vs warnings and redacted preview **without** issuing a network probe, in `apps/api/src/modules/capability-registry/mcp-draft.validator.ts` (FR-017, FR-019; OpenAPI `draft:validate`)
- [X] T074 [US3] Add MCP HTTP routes to `apps/api/src/modules/capability-registry/capability-registry.controller.ts`: get/patch/delete, draft validate, audit, `POST /capabilities/mcp/{mcpId}/validate` that issues an environment check rather than in-process heuristics (FR-023, FR-022a)
- [X] T075 [US3] Append audits `mcp.registered`, `mcp.updated`, `mcp.removed`, `mcp.remove_blocked`, `mcp.revalidated`, `mcp.register_conflict` (failed unique-label), `secret.stored` (type + fingerprint only), `environment_check.requested|answered|expired`; `metadata_redacted_json` never contains credential values, password hashes, session tokens, or connector bearers, via `apps/api/src/modules/observability-governance/audit.service.ts` (FR-025, FR-028)
- [X] T076 [US3] Add read-only `AgentAttachmentQueryPort` listing agents that reference a capability through `agent_capability_attachments` in `apps/api/src/modules/agent-registry/agent-attachment.query.ts`; Capability Registry must not write agents (FR-031; Constitution III)
- [X] T077 [US3] Refuse skill/MCP delete with 409 `referencingAgents: [{ id, name }]` when any attachment exists; leave the capability unchanged; audit `*.remove_blocked`, in `apps/api/src/modules/capability-registry/capability-registry.service.ts` (FR-031; demo step 24)
- [X] T078 [US3] Seed one published agent **with no attachment** at bootstrap via `packages/test-support/src/published-agent-fixture.ts`. Invoke `attachCapabilityToSeededAgent` only after a capability exists (e2e/demo step 23a). **Do not** add Agent Registry UI (FR-031; demo Before you start / steps 23a–24)
- [X] T079 [US3] Redact credential-like strings in external error/validation payloads before they are shown or recorded, using existing `RedactionService` in `apps/api/src/platform/security/redaction.service.ts` (FR-030)
- [X] T080 [P] [US3] Build MCP list/entity column/creation workspace/detail in `apps/web/src/features/capabilities/McpServersPage.tsx`, `apps/web/src/features/capabilities/McpCreationWorkspace.tsx`, and `apps/web/src/features/capabilities/McpDetailPage.tsx`: write-once credential field never redisplays; show origin, allowed tools, required flag, credential reference + health only; **who registered/last changed and when plus append-only history** (FR-027); status families; revalidate action; delete error names agents (FR-009, FR-019, FR-021, FR-023, FR-027, FR-028; demo steps 16–18, 23, 24; absorbs 001 T100 remainder)
- [X] T081 [US3] Live MCP form validation + configuration preview with no secret in the preview JSON, in `apps/web/src/features/capabilities/McpCreationWorkspace.tsx` (FR-017, FR-018, FR-028; demo step 11 analogue)
- [X] T082 [US3] Entity-column overflow: skills and MCP lists must remain usable when they exceed the 260px column (scroll, not clipped with no access) in `packages/ui/src/shell/EntityColumn.tsx` (spec edge case)

**Checkpoint**: All three user stories are independently testable. Demo.md steps 1–24 are achievable on the real stack.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Principle VI evidence, secret scanning, 001 e2e isolation, and quickstart commands that actually work.

- [X] T083 [P] Add a 002 secret-canary integration/e2e assertion covering every browser-visible 002 API, validation message, configuration preview, and audit payload in `apps/api/test/integration/secret-canary-002.test.ts` and `tests/e2e/cockpit-capabilities.spec.ts` (FR-028, SC-003; demo steps 17, 18)
- [X] T087 Add keyboard/focus/contrast checks for the shell, sign-in, and creation workspaces in `tests/e2e/cockpit-capabilities.spec.ts` (FR-006; 001 T082 analogue, real stack)
- [X] T088 [P] Document demo step 19 SQL (`SELECT id, fingerprint, left(encrypted_value, 32) FROM workspace_secrets`) and the step-23a attach command in `specs/002-cockpit-shell-capabilities/quickstart.md` (FR-029, FR-031)
- [X] T089 Update `specs/002-cockpit-shell-capabilities/quickstart.md` with verified `pnpm` commands, Vite proxy, connector check loop (not executor commands), and `pnpm exec playwright test --project=cockpit-002` (plan Testing Strategy)
- [X] T090 Concurrent-edit UX: losing PATCH shows the 409 and does not silently overwrite, in `apps/web/src/features/capabilities/SkillDetailPage.tsx` and `apps/web/src/features/capabilities/McpDetailPage.tsx` (FR-033)
- [X] T091 Session-expiry-while-dirty-form: expired cookie redirects to sign-in without leaking the unsaved capability payload in network retries, in `apps/web/src/lib/api.ts` and `apps/web/src/app-shell/AuthGate.tsx` (spec edge case; FR-001, FR-004)
- [X] T092 Confirm `CapabilityRegistryService` / `AuditRepository` have no leftover in-memory stores and that `http-openapi.contract.test.ts` no longer instantiates services behind a fake Fastify stub as 002 evidence (Principle VI)
- [X] T093 Run lint, typecheck, unit, integration, contract, and `pnpm exec playwright test --project=cockpit-002`. **This task fails unless every command exits 0.** Record the passing run in `specs/002-cockpit-shell-capabilities/verification.md`. A markdown file is a record, not a substitute for CI (quickstart; SC-010)

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: Starts immediately. T001 precedes T014/T026; T002–T006, T084–T086 may proceed concurrently. T084 must complete before US2 restart tests.
- **Phase 2 - Foundational**: Depends on Phase 1 and blocks every story. T007–T009 precede T010; T012 depends on T007; T014 depends on T001 and T007; T016–T017 can proceed in parallel with API identity work; T018–T019 precede US3 probes but are required before stories so US2 cannot accidentally keep in-process MCP heuristics.
- **Phase 3 - User Story 1**: Depends only on Phase 2. T023–T025 must exist and fail before T026–T041. T025 depends on T005/T084/T085.
- **Phase 4 - User Story 2**: Depends on Phase 2. T042–T044 must fail before T045–T054. T043/T044 depend on T084 OS-process helper.
- **Phase 5 - User Story 3**: Depends on Phase 2. T055–T059 must fail before T060–T082. Do not start T069 until T004's Streamable HTTP test MCP exists.
- **Phase 6 - Polish**: Depends on the targeted stories. T093 fails closed (every command exit 0) and is last.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1: Sign-in and cockpit shell          (demo 1–8)
                    -> US2: Durable skills + audit             (demo 9–15; consumes US1)
                    -> US3: MCP secrets + connector checks     (demo 16–24; consumes US1)

Complete 002 increment: US1 -> US2 -> US3 -> Polish
```

US2 and US3 can proceed in parallel **after** Foundation if US1 auth cookies are available via fixtures, but the reviewer demo is sequential P1 → P2 → P3. The shell without Skills/MCP working screens would violate FR-014, so US1 includes placeholder API-backed list pages (T041) until US2/US3 replace them with full creation workspaces.

### Within Each User Story

1. Add contract, integration, and Playwright tests and confirm the intended failures.
2. Complete persistence/contracts before HTTP and UI.
3. Domain services before controllers and pages.
4. Connector check-in before MCP reachability claims.
5. Pass the story’s focused tests before declaring its checkpoint complete.

---

## Parallel Opportunities

- After T001, T002–T006 can proceed in parallel.
- In Foundation, schema T007–T009, contracts T011, cookie/CORS T015, and `@adlc/ui` T016–T017 touch separate files.
- After Foundation, US1 tests T023–T025 are parallel; US2 tests T042–T044 and US3 tests T055–T059 can be authored in parallel by separate people using fixtures.
- Within US2, T045 (validator) can proceed beside T049 (audit DTO) and T050 (Skills UI against failing APIs).
- Within US3, T064–T066 (API connector routes), T068–T071 (connector process), and T080 (MCP UI) touch different trees.

## Parallel Examples

### User Story 1

```text
T023 Auth HTTP contract tests
T024 Operator session PostgreSQL tests
T025 Playwright demo steps 1–8 (will fail until T026–T041)
```

### User Story 2

```text
T042 Skill HTTP contract tests
T043 Skill persistence + append-only audit integration tests
T044 Playwright demo steps 9–15 with API restart
```

### User Story 3

```text
T055 MCP + connector HTTP contract tests
T056 Reachability + secret-at-rest integration tests
T057 Delete-guard integration tests
T058 Connector typed-check protocol tests
T059 Playwright demo steps 16–24
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Demo.md steps 1–8 on the real stack
5. Do not call this the 002 increment; Principle VI requires Skills and MCP in the same release

### Incremental Delivery

1. Setup + Foundational → identity and shell primitives exist
2. User Story 1 → sign-in cockpit (demo 1–8)
3. User Story 2 → durable attributed skills (demo 9–15, including restart)
4. User Story 3 → secret-safe MCP + connector-measured reachability (demo 16–24)
5. Polish → SC-010 Playwright and PostgreSQL evidence recorded

### Slice-size warning

Plan.md already records that shell + identity + persistence + encrypted secrets + connector checks + real e2e is a large pass. Sequence P1 → P2 → P3. Do not start US3 probes until T018/T019 have removed in-process MCP heuristics from production. Do not cite spec 001 Playwright as 002 evidence.

---

## Demo.md traceability (all 24 steps)

| Demo step | Covered by | Notes |
|---|---|---|
| 1 Signed-out refused | T012, T023, T025, T031 | |
| 2 Deep link signed-out | T025, T031, T033 | `next` preserved |
| 3 Sign-in shell + identity | T026–T032, T025 | |
| 4 Rail only working areas | T034, T041 | Skills + MCP only |
| 5 Move between areas | T038, T041 | |
| 6 Collapse/hide assistant | T036, T017 | Resize, never overlay |
| 7 Reload restores area + panel | T033, T036 | `localStorage` |
| 8 Sign-out then last URL | T026, T027, T025 | |
| 9 Creation workspace, no modal | T050 | |
| 10 Empty required blocked | T045, T051 | |
| 11 Live validation + preview | T045, T051 | ≤ 1s |
| 12 Save appears with status | T046, T052 | |
| 13 History who/when | T047, T049, T052 | |
| 14 Edit adds second audit | T047, T052 | First entry unchanged |
| 15 Restart platform | T043, T044, T084 | Principle VI |
| 16 Private-net MCP reachable | T004, T056, T059, T063, T069, T080 | Streamable HTTP, not HTTP ping |
| 17 Secret absent in UI | T060, T080, T083 | |
| 18 Secret absent in network | T023/T055, T059, T083 | |
| 19 Secret unreadable at rest | T056, T060, T088 | Reviewer SQL |
| 20 Duplicate label | T055, T059, T061 | |
| 21 Unreachable retained | T059, T061, T067 | |
| 22 Connector stopped → unverified | T062, T065, T059 | Never guessed |
| 23 Restart connector + revalidate | T066, T074, T080 | |
| 23a Attach saved MCP to seeded agent | T006, T078, T088 | After a capability exists |
| 24 Delete-guard names agents | T006, T057, T076–T078, T080 | No editor UI |

---

## Absorbed 001 convergence items (status at `9f47f5a`)

| 001 id | Status in code | 002 tasks |
|---|---|---|
| T089 encrypt secrets | **Partial.** `SecretVaultService` exists; session runtime secrets and bootstrap executor placeholder are encrypted. MCP register still stores client `credentialSecretId` and does not encrypt a write-once `credential`. | T060, T056 |
| T090 Drizzle append-only audit | **Mostly done.** `AuditRepository` already `insert`/`select` only; `prevent_audit_log_mutation` exists in `0001_foundation.sql`. Actor is still a header-derived id; DTO is `actorId` not display name; 002 action names missing. | T047, T049, T043, T075 |
| T091 persist skills/MCP | **Partial.** Service already uses Drizzle, **not** a `Map`. Missing `created_by`, reachability columns, get/patch/delete, write-once credential, stop `ensureWorkspace(clientId)`. | T009, T046, T061 |
| T096 register + check-in | **Partial.** Heartbeat endpoint and connector heartbeat loop exist. No `/connectors/register`. Bootstrap marks connector `online` immediately. No `environment_checks`, no `checks/next`. Loop still polls executor `commands/next`. | T014, T064, T065, T066, T068 |
| T099 capability probe half | **Not done.** API still calls in-process `probeMcpReachability` hostname heuristics. | T018, T019, T063, T069 |
| T100 capability UI half | **Partial.** Page calls the API **and** local `useState` fake-valid rows. Combined `/capabilities`, no shell, no credential field. | T050, T080, T029 |
| T104 Drizzle vs SQL | **Mostly done for 001.** `encrypted_value` is already `text`; `required` is boolean; `0006` live-fleet columns match `command-center.ts`. Outstanding: 002 columns/tables (`workspace_users`, sessions, checks, reachability, `created_by`). Keep `encrypted_value` as `text`. | T007–T010 |
| T105 `forceMcpStatus` | **Done.** Lives in `apps/api/test/integration/support/us2-fixtures.ts`, not the production service. Do not reintroduce it on `CapabilityRegistryService`. | T019 (guardrail only) |

---

## Task Summary

- **Total tasks**: 93
- **Setup tasks**: 9 (T001–T006, T084–T086)
- **Foundational tasks**: 16 (T007–T022)
- **User Story 1 tasks**: 19 (T023–T041)
- **User Story 2 tasks**: 13 (T042–T054)
- **User Story 3 tasks**: 28 (T055–T082)
- **Polish tasks**: 11 (T083–T093)
- **Suggested MVP**: Phases 1–3 (User Story 1 / demo steps 1–8)
- **Complete 002 increment**: Phases 1–6 (demo steps 1–24 + Principle VI evidence)

---

## Notes

- [P] tasks = different files, no unmet dependencies in the same group.
- Do not recreate Drizzle persistence for skills, MCP, or audit — complete the remaining behavior on the existing services.
- Do not cite `tests/e2e/prepare-runnable-agent.spec.ts` (or other 001 e2e) as 002 acceptance; they intercept `/api/`.
- Do not start executors, run sessions, ingest events, or validate artifact files (slice 004).
- Do not add Agent Registry UI (slice 003). Seed the published agent with no attachment; attach after a capability exists (demo 23a).
- Commit after each task or logical group. Stop at each story checkpoint and run that story’s tests plus the matching demo.md steps.
- Avoid: second identity store, API-side MCP HTTP fetch, dead rail items, modal-first creation, putting secrets in audit or previews.

---

## Phase 7: Visual Design-System Compliance (amended 2026-09-19)

Constitution v1.2.0 Principle VII. Functional 002 acceptance is unchanged.
These tasks close the gap between shipped tokens and `DesignSystem.tsx`.

- [X] T094 Port `DesignSystem.tsx` primitives (SvgIcon + `I`, StatusDot, Badge, Brackets, Button, Field, inputs, FormSection, IdChip, SectionLabel, EntityRow, ValidationList, JsonPreview) into `packages/ui/src` and export them from `packages/ui/src/index.ts` (FR-011, FR-012, Principle VII)
- [X] T095 Replace `packages/ui/src/tokens.css` with the `@theme` tokens, fonts, keyframes, and canvas classes from `apps/Debate AI SDLC Command Center UI/src/index.css`; restyle `WorkspaceShell`, `TopBar`, `NavRail`, `EntityColumn`, `AssistantPanel`, `CreationWorkspace`, and `StatusBadge` with those recipes (FR-006)
- [X] T096 Restyle `apps/web` shell chrome (`AppShellLayout`, `AssistantDock`, `EnvironmentHealthChip`, `AuthGate`) to the icon rail, top-bar, and assistant-strip recipes; keep existing accessible names used by `tests/e2e/cockpit-capabilities.spec.ts`
- [X] T097 Restyle sign-in, Skills, and MCP pages (`SignInPage`, `SkillsPage`, `SkillCreationWorkspace`, `SkillDetailPage`, `McpServersPage`, `McpCreationWorkspace`, `McpDetailPage`) with Field / FormSection / validation panel / ID chips; do not change request payloads or `data-testid` contracts
- [X] T098 Remove global unstyled `button`/`input` overrides from `apps/web/src/styles.css` that fight the design system; add Tailwind `@source` for `packages/ui/src`
- [X] T099 Typecheck `@adlc/ui` and `@adlc/web`. Do not weaken Playwright selectors to make the visual restyle pass.
