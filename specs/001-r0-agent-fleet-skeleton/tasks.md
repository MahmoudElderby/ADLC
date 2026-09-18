# Tasks: R0 Agent Fleet Control Plane Walking Skeleton

**Input**: Design documents from `/specs/001-r0-agent-fleet-skeleton/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are required because the constitution mandates automated coverage at artifact, snapshot, audit, connector, and cross-module trust boundaries. Within each story, create the listed tests first and confirm they fail for the expected missing behavior before implementing the story.

**Organization**: Tasks are grouped by user story so each story can be implemented and demonstrated independently. User Story 1 is the configuration/publishing MVP; the complete R0 walking skeleton requires all three stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be implemented in parallel because it changes different files and has no unmet dependency on another task in the same group.
- **[Story]**: Maps the task to User Story 1, 2, or 3.
- Every task names the exact file or directory it changes.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the workspace, applications, packages, and repeatable local environment described by the implementation plan.

- [X] T001 Create the pnpm workspace, root scripts, and shared dependency catalog for Node.js 24 and TypeScript 5 in `./pnpm-workspace.yaml` and `./package.json`
- [X] T002 Create the shared TypeScript base, application, and library configurations in `tsconfig.base.json`, `config/typescript/tsconfig.app.json`, and `config/typescript/tsconfig.lib.json`
- [X] T003 [P] Scaffold the NestJS API application with the Fastify adapter and health bootstrap in `apps/api/package.json`, `apps/api/src/main.ts`, and `apps/api/src/app.module.ts`
- [X] T004 [P] Scaffold the React 19 and Vite web application entry point in `apps/web/package.json`, `apps/web/index.html`, and `apps/web/src/main.tsx`
- [X] T005 [P] Scaffold the self-hosted workspace connector application in `apps/workspace-connector/package.json` and `apps/workspace-connector/src/main.ts`
- [X] T006 [P] Scaffold the contracts, database, test-support, and UI workspace packages in `packages/contracts/package.json`, `packages/database/package.json`, `packages/test-support/package.json`, and `packages/ui/package.json`
- [X] T007 Configure ESLint, Prettier, and repository-wide lint/format scripts in `./eslint.config.mjs`, `./.prettierrc.json`, and `./package.json`
- [X] T008 Configure Vitest projects and coverage defaults for applications and packages in `vitest.workspace.ts` and `config/vitest/vitest.shared.ts`
- [X] T009 [P] Configure Playwright projects for desktop and mobile golden-path coverage in `playwright.config.ts` and `tests/e2e/fixtures.ts`
- [X] T010 Define local PostgreSQL, API, web, and connector services plus safe example environment variables in `compose.yaml`, `.env.example`, and `apps/workspace-connector/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared security, persistence, request, streaming, connector, and UI foundations required by every user story.

**Critical**: No user story implementation begins until this phase is complete.

- [X] T011 Define the base workspace, encrypted secret, environment setting, workspace connector, and append-only audit tables with workspace scoping and no audit update/delete API in `packages/database/src/schema/foundation.ts`
- [X] T012 Configure Drizzle for PostgreSQL 17 and generate the initial foundational migration in `packages/database/drizzle.config.ts` and `packages/database/drizzle/0001_foundation.sql`
- [X] T013 [P] Implement validated API and connector configuration loaders that reject plaintext secret persistence settings in `apps/api/src/platform/config/config.ts` and `apps/workspace-connector/src/security/config.ts`
- [X] T014 [P] Implement the single authenticated workspace-user request context and workspace scoping guard, with no platform-engineer/operator role split, in `apps/api/src/platform/auth/workspace-user.guard.ts` and `apps/api/src/platform/auth/request-context.ts`
- [X] T015 [P] Implement RFC 7807 error responses, correlation IDs, and Fastify request logging in `apps/api/src/platform/http/problem-details.filter.ts` and `apps/api/src/platform/http/request-logging.hook.ts`
- [X] T016 Implement envelope encryption for stored secrets and recursive redaction for browser responses, errors, snapshots, events, and audits in `apps/api/src/platform/security/secret-vault.service.ts` and `apps/api/src/platform/security/redaction.service.ts`
- [X] T017 Write failing security tests proving configured secret canaries never appear in redacted nested payloads or encrypted-secret reads in `apps/api/test/integration/security-redaction.test.ts`
- [X] T018 Implement the append-only attributable audit writer and query boundary in `apps/api/src/modules/observability-governance/audit.service.ts` and `apps/api/src/modules/observability-governance/audit.repository.ts`
- [X] T019 [P] Define shared Zod identifiers, timestamps, validation statuses, problem details, and paginated response schemas in `packages/contracts/src/common.ts`
- [X] T020 [P] Define the isolated `OpenAIAgentsGateway` port, production adapter shell, and deterministic fake without leaking API credentials in `apps/api/src/integrations/openai/openai-agents.gateway.ts`, `apps/api/src/integrations/openai/openai-agents.adapter.ts`, and `packages/test-support/src/fakes/openai-agents.fake.ts`
- [X] T021 Configure the Drizzle connection, transaction helper, and pg-boss queue lifecycle in `apps/api/src/platform/database/database.module.ts` and `apps/api/src/platform/queue/queue.module.ts`
- [X] T022 [P] Implement connector token hashing, authenticated outbound connector requests, and replay-safe command envelope validation in `apps/api/src/modules/workspace-environment/connector-auth.service.ts` and `apps/workspace-connector/src/security/control-plane-auth.ts`
- [X] T023 [P] Build the web application shell, routes, TanStack Query client, Zustand workspace context, and accessible error boundary in `apps/web/src/app-shell/App.tsx`, `apps/web/src/app-shell/router.tsx`, and `apps/web/src/app-shell/providers.tsx`
- [X] T024 Add OpenAPI linting, schema compatibility, migration, and test-database helpers to CI in `.github/workflows/ci.yml`, `packages/test-support/src/postgres.ts`, and `packages/contracts/package.json`

**Checkpoint**: Shared persistence, security, transport, connector authentication, test harnesses, and UI shell are ready. Story work may now proceed.

---

## Phase 3: User Story 1 - Prepare a Runnable Agent (Priority: P1) - MVP

**Goal**: Register and validate one skill and one environment-origin HTTP MCP server, create an Always allow agent using both, review it, and publish an immutable version with audit evidence.

**Independent Test**: Starting with a healthy workspace and no capabilities, register a skill and MCP server, attach both to a draft agent, publish it, and verify the published version retains the exact capability references and `always_allow` mode without exposing a credential value.

### Tests for User Story 1

> Write these tests first and verify each fails for the intended missing behavior.

- [X] T025 [P] [US1] Add contract tests for skill and MCP list/register/validate responses, RFC 7807 failures, HTTP-only transport, `environment` connection origin, nonempty allowed tools, and credential-reference redaction in `apps/api/test/contract/capability-registry.contract.test.ts`
- [X] T026 [P] [US1] Add integration tests for `(workspace_id, name, version)` skill uniqueness, workspace-unique MCP labels, connector-origin VPN reachability, missing credentials, and actionable validation failures in `apps/api/test/integration/capability-validation.test.ts`
- [X] T027 [P] [US1] Add contract tests for agent list/create/get/patch/publish, draft-only mutation, blocking errors versus warnings, and published-only session eligibility in `apps/api/test/contract/agent-registry.contract.test.ts`
- [X] T028 [P] [US1] Add integration tests for unique capability attachments, immutable published versions, `always_allow`, invalid-capability publication rejection, and attributable create/attach/publish audits in `apps/api/test/integration/agent-publication.test.ts`
- [X] T029 [P] [US1] Add a Playwright journey that registers both capabilities, creates and reviews an agent, handles a blocked publish, publishes after correction, and verifies no secret is rendered in `tests/e2e/prepare-runnable-agent.spec.ts`

### Implementation for User Story 1

- [X] T030 [P] [US1] Define Zod request/response schemas for skills and MCP servers, fixing MCP `transport` to `http`, `connectionOrigin` to `environment`, and requiring at least one allowed tool in `packages/contracts/src/capabilities.ts`
- [X] T031 [P] [US1] Add `skills` and `mcp_servers` Drizzle tables with workspace scoping, skill `(workspace_id, name, version)` uniqueness, MCP label uniqueness, validation state, encrypted credential reference, and no credential value column in `packages/database/src/schema/capabilities.ts`
- [X] T032 [US1] Generate and verify capability registry indexes and constraints in `packages/database/drizzle/0002_capability_registry.sql`
- [X] T033 [P] [US1] Implement connector health, skill compatibility, typed MCP reachability, and credential-health probes without a generic shell command in `apps/workspace-connector/src/health/capability-probes.ts`
- [X] T034 [US1] Implement the API connector command client for typed workspace health and capability-validation requests in `apps/api/src/modules/workspace-environment/connector-command.service.ts`
- [X] T035 [US1] Implement capability registration, encrypted credential-reference handling, validation state transitions, and audit writes in `apps/api/src/modules/capability-registry/capability-registry.service.ts`
- [X] T036 [US1] Implement skill and MCP list/register/validate endpoints from `contracts/openapi.yaml` in `apps/api/src/modules/capability-registry/capability-registry.controller.ts` and `apps/api/src/modules/capability-registry/capability-registry.module.ts`
- [X] T037 [P] [US1] Define agent draft, review, version, attachment, publication, and `always_allow` contract schemas in `packages/contracts/src/agents.ts`
- [X] T038 [P] [US1] Add `agents`, `agent_versions`, and `agent_capability_attachments` tables with draft/published status, immutable published rows, and `(agent_version_id, capability_type, capability_id)` uniqueness in `packages/database/src/schema/agents.ts`
- [X] T039 [US1] Generate the agent registry migration and database guards against mutation of published versions in `packages/database/drizzle/0003_agent_registry.sql`
- [X] T040 [US1] Implement draft creation/editing, capability attachment replacement, review errors/warnings, publication validation, immutable version creation, OpenAI agent synchronization, and audit writes in `apps/api/src/modules/agent-registry/agent-registry.service.ts`
- [X] T041 [US1] Implement agent list/create/get/patch/publish endpoints and ensure only published versions are returned as runnable in `apps/api/src/modules/agent-registry/agent-registry.controller.ts` and `apps/api/src/modules/agent-registry/agent-registry.module.ts`
- [X] T042 [P] [US1] Build the Capability Registry screens with workspace-origin indicators, validation details, allowed-tool editing, and credential-reference-only rendering in `apps/web/src/features/capabilities/CapabilityRegistryPage.tsx` and `apps/web/src/features/capabilities/CapabilityEditor.tsx`
- [X] T043 [US1] Build the agent draft editor and review/publish screen with attached skill/MCP summaries, Always allow display, blocking errors, warnings, and published confirmation in `apps/web/src/features/agents/AgentEditorPage.tsx` and `apps/web/src/features/agents/AgentReviewPanel.tsx`

**Checkpoint**: User Story 1 is independently usable and testable. A published, auditable agent is available without requiring session execution.

---

## Phase 4: User Story 2 - Run the Agent and Track Its Artifact (Priority: P2)

**Goal**: Start a published agent in the single self-hosted workspace, execute it through the official Codex executor with workspace-origin MCP access, stream durable progress, and retain a distinct provenance record for every Markdown artifact report.

**Independent Test**: Using a seeded published agent and healthy connector, start a task that produces a `.md` file, observe ordered progress through a distinct terminal outcome, and open the artifact record with producing agent/session, report occurrence, timestamps, status, and workspace-contained file reference.

### Tests for User Story 2

> Write these tests first and verify each fails for the intended missing behavior.

- [ ] T044 [P] [US2] Add contract tests for workspace get/health/validate and session start/get/cancel endpoints, including published-agent-only selection and distinct completed/failed/canceled/interrupted outcomes in `apps/api/test/contract/session-runner.contract.test.ts`
- [ ] T045 [P] [US2] Add connector protocol tests for token authentication, long polling, replay-safe command/result handling, fixed official executor invocation, and rejection of arbitrary shell requests in `apps/workspace-connector/test/connector-protocol.test.ts`
- [ ] T046 [P] [US2] Add integration tests for start-time workspace/capability readiness, VPN-only MCP reachability from the connector, immutable redacted snapshots, runtime-secret isolation, and blocked-start explanations in `apps/api/test/integration/session-readiness.test.ts`
- [ ] T047 [P] [US2] Add integration tests for raw event idempotency by `(session_id, source_event_id)`, monotonic sequence uniqueness, one normalized event per raw event, terminal-state immutability, and partial evidence retention in `apps/api/test/integration/session-event-ingestion.test.ts`
- [ ] T048 [P] [US2] Add SSE contract tests for persisted replay from `Last-Event-ID`, live follow, recursive redaction, reconnect without duplicate records, and every event type in `contracts/sse-events.md` in `apps/api/test/contract/session-stream.contract.test.ts`
- [ ] T049 [P] [US2] Add artifact integration tests for one record per `(session_id, source_event_id)`, repeated path reports remaining distinct, `.md` enforcement, workspace containment, unreadable/missing files, and invalid reports preserving the session in `apps/api/test/integration/artifact-provenance.test.ts`
- [ ] T050 [P] [US2] Add a Playwright journey that starts a seeded published agent, observes progress and terminal state, cancels a second run, and opens a valid artifact provenance record in `tests/e2e/run-agent-and-track-artifact.spec.ts`

### Implementation for User Story 2

- [ ] T051 [P] [US2] Define workspace health, session start/cancel/detail, session-state, redacted snapshot, event, and artifact Zod schemas in `packages/contracts/src/sessions.ts` and `packages/contracts/src/workspace-environment.ts`
- [ ] T052 [P] [US2] Add `agent_sessions`, `session_runtime_secrets`, and `workspace_connector_commands` tables with `creating|provisioning|running` nonterminal states, four terminal states, encrypted runtime secrets, replay keys, and immutable terminal transitions in `packages/database/src/schema/sessions.ts`
- [ ] T053 [P] [US2] Add `session_events_raw`, `session_events_normalized`, `artifacts`, and `errors` tables with source-event and sequence uniqueness, one-to-one normalization, artifact identity by report occurrence, and deliberately nonunique file path in `packages/database/src/schema/observability.ts`
- [ ] T054 [US2] Generate session, event, artifact, runtime-secret, and connector-command constraints and indexes in `packages/database/drizzle/0004_session_execution.sql`
- [ ] T055 [US2] Implement workspace connector registration, heartbeat freshness, tooling/filesystem/secret-reference health aggregation, and the single-environment API view in `apps/api/src/modules/workspace-environment/workspace-environment.service.ts` and `apps/api/src/modules/workspace-environment/workspace-environment.controller.ts`
- [ ] T056 [US2] Implement session readiness checks for published version, current capability validity, connector health, workspace path, MCP VPN reachability, and secret-reference health in `apps/api/src/modules/session-runner/session-readiness.service.ts`
- [ ] T057 [US2] Implement the session lifecycle state machine, immutable redacted configuration snapshot, actor attribution, start/cancel transactions, four terminal outcomes, and audit events in `apps/api/src/modules/session-runner/session.service.ts`
- [ ] T058 [US2] Implement the OpenAI Agents session adapter that resolves the immutable published version, applies `always_allow`, binds registered skills and environment-origin remote HTTP MCP metadata, and never sends connector credentials to the browser in `apps/api/src/integrations/openai/openai-session.adapter.ts`
- [ ] T059 [P] [US2] Implement connector heartbeat and authenticated long-poll command/result clients with stable command IDs in `apps/workspace-connector/src/control-plane/control-plane.client.ts` and `apps/workspace-connector/src/control-plane/command-loop.ts`
- [ ] T060 [US2] Implement the constrained executor supervisor that starts/stops only the official `codex exec-server` with the approved workspace path, remote URL, environment ID, and connector-local restricted executor key in `apps/workspace-connector/src/executor/exec-server.supervisor.ts`
- [ ] T061 [US2] Implement transactional raw event ingestion, idempotent normalization, sequence allocation, state-transition handling, tool activity retention, and recursive redaction in `apps/api/src/modules/session-runner/session-event.service.ts`
- [ ] T062 [US2] Implement Markdown artifact validation through the typed connector probe, canonical workspace containment checks, per-report provenance creation, and invalid-artifact status retention in `apps/api/src/modules/observability-governance/artifact.service.ts` and `apps/workspace-connector/src/health/artifact-probe.ts`
- [ ] T063 [US2] Implement session start/get/cancel and artifact-list endpoints from `contracts/openapi.yaml` in `apps/api/src/modules/session-runner/session.controller.ts` and `apps/api/src/modules/session-runner/session-runner.module.ts`
- [ ] T064 [US2] Implement persisted SSE replay followed by live delivery, using local monotonic sequence as the SSE ID and honoring `Last-Event-ID`, in `apps/api/src/platform/streaming/session-stream.service.ts` and `apps/api/src/modules/session-runner/session-stream.controller.ts`
- [ ] T065 [P] [US2] Build the single-environment health panel and session launch form that lists only published agents and explains readiness blockers in `apps/web/src/features/workspace/WorkspaceHealthPanel.tsx` and `apps/web/src/features/sessions/StartSessionPage.tsx`
- [ ] T066 [US2] Build the live session summary, reconnecting SSE progress feed, terminal outcome states, cancel action, and artifact provenance view in `apps/web/src/features/sessions/SessionDetailPage.tsx`, `apps/web/src/features/sessions/SessionProgress.tsx`, and `apps/web/src/features/sessions/ArtifactPanel.tsx`

**Checkpoint**: User Story 2 is independently testable with seeded Story 1 data. Execution happens only in the self-hosted workspace and every artifact report has durable provenance.

---

## Phase 5: User Story 3 - Monitor and Investigate the Run (Priority: P3)

**Goal**: Show active sessions in Command Center and let an operator reconstruct any run through ordered trace, immutable redacted snapshot, artifacts, agent configuration, terminal outcome, and attributable audit history.

**Independent Test**: With seeded active and terminal sessions containing representative events and artifacts, locate the active run in Command Center, navigate to its details and evidence, then verify terminal sessions leave the live canvas while remaining discoverable in history.

### Tests for User Story 3

> Write these tests first and verify each fails for the intended missing behavior.

- [ ] T067 [P] [US3] Add contract tests for live-fleet dashboard, session history/detail/trace/artifacts, and filtered audit responses with secret canaries and stable navigation identifiers in `apps/api/test/contract/command-center-observability.contract.test.ts`
- [ ] T068 [P] [US3] Add integration tests proving the live projection contains only nonterminal sessions, updates within the same transaction as state changes, removes all four terminal outcomes, and preserves historical navigation in `apps/api/test/integration/live-fleet-projection.test.ts`
- [ ] T069 [P] [US3] Add integration tests for ordered trace reconstruction, tool/error/artifact links, immutable schema-versioned redacted snapshots, attributable audits, and retained partial evidence after interruption in `apps/api/test/integration/session-investigation.test.ts`
- [ ] T070 [P] [US3] Add a Playwright journey from Command Center to session, agent, trace, artifact, snapshot, and audit evidence, including terminal removal and history discovery in `tests/e2e/monitor-and-investigate-session.spec.ts`

### Implementation for User Story 3

- [ ] T071 [P] [US3] Define live-fleet, session-history, trace, snapshot, and audit query/response schemas in `packages/contracts/src/command-center.ts` and `packages/contracts/src/observability.ts`
- [ ] T072 [P] [US3] Add the `live_fleet_sessions` projection table constrained to nonterminal sessions and indexes for workspace/status/session history queries in `packages/database/src/schema/command-center.ts`
- [ ] T073 [US3] Generate live-fleet projection and investigation-query indexes in `packages/database/drizzle/0005_command_center.sql`
- [ ] T074 [US3] Implement transactional live-fleet projection updates from session creation and state transitions, removing rows for completed, failed, canceled, and interrupted sessions in `apps/api/src/modules/command-center/live-fleet-projector.ts`
- [ ] T075 [US3] Implement dashboard and session-history queries with agent status, capability indicators, blocker/failure summaries, and stable links to retained records in `apps/api/src/modules/command-center/command-center.service.ts`
- [ ] T076 [US3] Implement trace assembly over normalized events with ordered state, output, tool, error, artifact, and timestamp evidence plus immutable snapshot retrieval in `apps/api/src/modules/observability-governance/trace.service.ts`
- [ ] T077 [US3] Implement live-fleet dashboard, session trace, and audit-log endpoints from `contracts/openapi.yaml` in `apps/api/src/modules/command-center/command-center.controller.ts` and `apps/api/src/modules/observability-governance/observability.controller.ts`
- [ ] T078 [P] [US3] Build the React Flow Command Center live canvas with active-agent nodes, current status, capability indicators, blocked/failed treatment, stable dimensions, and navigation to session detail in `apps/web/src/features/command-center/CommandCenterPage.tsx` and `apps/web/src/features/command-center/LiveFleetCanvas.tsx`
- [ ] T079 [P] [US3] Build searchable session history with distinct terminal outcomes and links back to agent and session evidence in `apps/web/src/features/sessions/SessionHistoryPage.tsx`
- [ ] T080 [US3] Add trace, redacted snapshot, artifacts, and audit tabs with ordered events and cross-navigation to the session detail view in `apps/web/src/features/sessions/SessionInvestigationTabs.tsx` and `apps/web/src/features/sessions/TraceTimeline.tsx`

**Checkpoint**: All three user stories are independently testable and together form the complete R0 walking skeleton.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Verify product-level security, resilience, usability, performance, and operational documentation across the complete slice.

- [ ] T081 [P] Add a repository secret-canary acceptance test covering every browser-visible API, SSE event, trace, artifact, snapshot, validation error, and audit payload in `tests/e2e/secret-redaction.spec.ts`
- [ ] T082 [P] Add accessibility checks for keyboard navigation, focus order, labels, status announcements, and contrast across the golden path in `tests/e2e/accessibility.spec.ts`
- [ ] T083 Add load and timing assertions for 95% status visibility within 2 seconds and artifact visibility within 5 seconds using representative event volume in `apps/api/test/integration/observability-performance.test.ts`
- [ ] T084 Add resilience tests for connector loss during execution, missing terminal events becoming interrupted, SSE disconnect/replay, duplicate command results, and retained partial evidence in `apps/api/test/integration/session-resilience.test.ts`
- [ ] T085 [P] Add an opt-in live OpenAI plus VPN-reachable MCP smoke test that creates one Markdown artifact without storing credentials or creating approval requests in `tests/smoke/live-openai-mcp.test.ts`
- [ ] T086 Harden production headers, CORS, body limits, rate limits, log redaction, and connector request timeouts in `apps/api/src/platform/security/http-hardening.ts` and `apps/workspace-connector/src/security/network-policy.ts`
- [ ] T087 Update the operator quickstart with exact setup, migration, connector, validation, test, golden-path, failure-path, and cleanup commands verified against the built applications in `specs/001-r0-agent-fleet-skeleton/quickstart.md`
- [ ] T088 Run and record the final lint, typecheck, unit, integration, contract, Playwright, migration, OpenAPI, and optional live-smoke results in `specs/001-r0-agent-fleet-skeleton/verification.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: Starts immediately. T001-T002 establish shared workspace configuration; tasks marked `[P]` may then proceed concurrently.
- **Phase 2 - Foundational**: Depends on Phase 1 and blocks every story. T011 precedes T012; T013-T015, T019-T020, T022-T023 can proceed in parallel; T016 precedes T017; T018 depends on T011 and T016; T021 and T024 close the foundation.
- **Phase 3 - User Story 1**: Depends only on Phase 2. Test tasks T025-T029 must exist and fail before implementation tasks T030-T043.
- **Phase 4 - User Story 2**: Depends only on Phase 2 when using seeded published-agent fixtures; the real golden path integrates with User Story 1. Test tasks T044-T050 must exist and fail before implementation tasks T051-T066.
- **Phase 5 - User Story 3**: Depends only on Phase 2 when using seeded session/event fixtures; the real golden path integrates with User Stories 1 and 2. Test tasks T067-T070 must exist and fail before implementation tasks T071-T080.
- **Phase 6 - Polish**: Depends on whichever story set is targeted. T088 is last and records every verification result.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1: Configure and publish
                    -> US2: Execute and track artifact (seeded published agent)
                    -> US3: Monitor and investigate (seeded session evidence)

Complete walking skeleton: US1 -> US2 -> US3 -> Polish
```

### Within Each User Story

1. Add contract, integration, and end-to-end tests and confirm the intended failures.
2. Add contracts and persistence models before their migrations.
3. Implement domain services before controllers and pages.
4. Implement connector behavior before flows that depend on connector results.
5. Pass the story's focused tests before declaring its checkpoint complete.

## Parallel Opportunities

- After T001-T002, API, web, connector, package, and Playwright scaffolds T003-T006 and T009 can proceed in parallel.
- In Foundation, request infrastructure T013-T015, contracts T019, OpenAI boundary T020, connector authentication T022, and web shell T023 touch separate files and can proceed concurrently.
- After Foundation, separate teams may build US1, US2, and US3 concurrently by using the specified seeded fixtures; integrate them in priority order for the final walking skeleton.
- Within US1, T025-T029 are parallel test authoring tasks; T030-T031, T033, and T037-T038 are parallel contract/schema/connector tasks; T042 can proceed alongside backend agent implementation.
- Within US2, T044-T050 are parallel test authoring tasks; T051-T053 are parallel schema tasks; T059 can proceed alongside API session services; T065 can proceed against contracts and fakes.
- Within US3, T067-T070 are parallel test authoring tasks; T071-T072 are parallel schema tasks; T078-T079 can proceed against contract fixtures.

## Parallel Examples

### User Story 1

```text
T025 Capability API contract tests
T026 Capability validation integration tests
T027 Agent API contract tests
T028 Agent publication integration tests
T029 Agent preparation Playwright journey
```

### User Story 2

```text
T044 Session API contract tests
T045 Connector protocol tests
T046 Readiness and snapshot integration tests
T047 Event ingestion integration tests
T048 SSE contract tests
T049 Artifact provenance integration tests
T050 Execution Playwright journey
```

### User Story 3

```text
T067 Observability API contract tests
T068 Live-fleet projection integration tests
T069 Investigation integration tests
T070 Command Center Playwright journey
```

## Implementation Strategy

### Configuration MVP

1. Complete Setup and Foundational phases.
2. Complete User Story 1.
3. Validate the independent US1 flow from empty registries to an immutable published agent and audit entry.
4. Demo the configuration/publishing MVP without requiring a live agent run.

### R0 Walking Skeleton

1. Deliver US1 to establish the published execution unit.
2. Deliver US2 to prove self-hosted execution, workspace-origin VPN MCP access, live progress, and Markdown provenance.
3. Deliver US3 to prove operational visibility and investigation.
4. Complete Phase 6 and record the full verification suite.

### Incremental Validation

- Stop after each story checkpoint and run that story's contract, integration, and Playwright tests independently.
- Use deterministic fakes and seeded fixtures for routine tests; reserve real OpenAI, VPN, and MCP access for T085.
- Preserve every accepted contract and historical invariant as later stories are added.

## Task Summary

- **Total tasks**: 88
- **Setup tasks**: 10
- **Foundational tasks**: 14
- **User Story 1 tasks**: 19
- **User Story 2 tasks**: 23
- **User Story 3 tasks**: 14
- **Polish tasks**: 8
- **Suggested MVP**: Phases 1-3 (User Story 1)
- **Complete walking skeleton**: Phases 1-6
