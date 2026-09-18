# Implementation Plan: R0 Agent Fleet Control Plane Walking Skeleton

**Branch**: `001-r0-agent-fleet-skeleton` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-r0-agent-fleet-skeleton/spec.md`

## Summary

Deliver the smallest operational ADLC slice that registers a referenced skill and an environment-origin HTTP MCP server, publishes an OpenAI-managed agent, runs it through an official executor in the single self-hosted workspace, tracks every Markdown artifact report, shows live state in Command Center, and preserves trace, redacted configuration, and append-only audit evidence.

The implementation is a TypeScript modular monolith with a React web client, a NestJS/Fastify API and worker, PostgreSQL persistence through Drizzle ORM, app-owned server-sent events, and a narrowly scoped workspace connector that starts the official `codex exec-server` for each OpenAI session. Module-owned application services perform all cross-module writes.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS; React 19.x for the browser client

**Primary Dependencies**: pnpm workspaces, NestJS with Fastify adapter, OpenAI JavaScript SDK, React, Vite, TanStack Query, Zustand, React Flow, Tailwind CSS, Radix UI, Zod, Drizzle ORM, PostgreSQL driver, pg-boss, and the official Codex CLI executor

**Storage**: PostgreSQL 17+ for product state, raw/normalized events, snapshots, artifacts, errors, and audit history; encrypted workspace secrets; Markdown files remain in the shared workspace filesystem

**Testing**: Vitest for unit and module tests, Testcontainers-backed PostgreSQL integration tests, contract tests against the OpenAPI and normalized SSE schemas, Playwright for browser flows, and an opt-in live OpenAI smoke test

**Target Platform**: Linux web/API deployment; modern Chromium, Firefox, and WebKit browsers; customer-controlled Linux, macOS, or Windows/WSL self-hosted workspace with outbound OpenAI connectivity and VPN access to the MCP server

**Project Type**: Web application with API/worker modular monolith plus a minimal environment-side workspace connector

**Performance Goals**: 95% of visible session-state updates within 2 seconds; artifact provenance visible within 5 seconds; normal registry/detail reads under 500 ms p95; live-fleet query under 1 second p95

**Constraints**: One self-hosted workspace per ADLC workspace; OpenAI-managed harness only; one official executor per session; environment-origin HTTP MCP; Always allow for the acceptance agent; no approval queue; no secret values in browser or persisted event/snapshot payloads; append-only audit; idempotent event replay

**Scale/Scope**: R0 target of dozens of workspaces, hundreds of agents, thousands of retained sessions, and tens of concurrent live sessions per workspace; this feature implements one-user golden-path depth rather than complete administration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Pre-Research | Post-Design | Evidence |
|------|--------------|-------------|----------|
| General fleet control plane, not scenario-specific | PASS | PASS | Entities and contracts use reusable agent, capability, session, artifact, and audit concepts. |
| OpenAI-managed execution; no custom agent runtime | PASS | PASS | OpenAI Agents API owns the harness; ADLC only launches the official executor and owns control-plane state. |
| Single workspace-wide self-hosted environment | PASS | PASS | Session contracts expose no environment selector and bind all runs to workspace settings. |
| Agent owns persona, skills, MCP attachments, and approval mode | PASS | PASS | Published agent version resolves all capability references and Always allow mode into the run snapshot. |
| Capabilities registered once and attached by reference | PASS | PASS | Skill and MCP records are independent resources linked through attachment records. |
| Auditable execution and redacted snapshots | PASS | PASS | Every state change emits audit evidence; each session stores a redacted effective snapshot and raw plus normalized events. |
| Markdown artifacts are filesystem references with provenance | PASS | PASS | Artifact records point to validated workspace-relative `.md` paths and do not duplicate file contents. |
| Configuration and operational status remain separate | PASS | PASS | Registry/settings screens own configuration; Command Center reads projections and links to session details. |
| Explicit module ownership and service-mediated cross-module writes | PASS | PASS | Module ports are defined in this plan and database tables have one owning module. |
| Required integration and UI test depth | PASS | PASS | Contract, cross-module integration, stream-replay, secret-redaction, and Playwright golden-path tests are planned. |

No constitutional violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-r0-agent-fleet-skeleton/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── connector-protocol.md
│   ├── openapi.yaml
│   └── sse-events.md
└── tasks.md                 # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── agent-registry/
│   │   │   ├── capability-registry/
│   │   │   ├── command-center/
│   │   │   ├── observability-governance/
│   │   │   ├── session-runner/
│   │   │   └── workspace-environment/
│   │   ├── integrations/openai/
│   │   └── platform/{auth,config,database,queue,streaming}/
│   └── test/{contract,integration}/
├── web/
│   ├── src/
│   │   ├── app-shell/
│   │   ├── features/{agents,capabilities,command-center,sessions,workspace}/
│   │   └── shared/
│   └── test/
└── workspace-connector/
    ├── src/{control-plane,executor,health,security}/
    └── test/

packages/
├── contracts/              # Zod DTOs and normalized event contracts
├── database/               # Drizzle schemas, migrations, and transaction helpers
├── test-support/           # Fixtures and OpenAI/MCP fakes
└── ui/                     # Shared shell primitives and status components

tests/
└── e2e/                    # Playwright golden-path and failure-path tests
```

**Structure Decision**: Use a pnpm workspace so the web client, API/worker, and workspace connector share validated contracts without collapsing module ownership. The API remains one modular-monolith deployment; the connector is an environment-side adapter required to start the official executor and is not an independent domain service.

## Design Overview

### Module Responsibilities

- **Workspace Environment Settings** owns the single workspace path, connector registration, executor health, filesystem checks, and environment-origin MCP reachability checks.
- **Capability Registry** owns skill references and HTTP MCP definitions. It validates compatibility and reachability but never returns secret material.
- **Agent Registry** owns drafts, immutable published versions, attachments, OpenAI agent publication, and publish-time validation.
- **Session Runner** creates local sessions, snapshots effective configuration, creates OpenAI sessions, dispatches executor startup, consumes upstream events, and drives terminal states.
- **Observability and Governance** owns raw and normalized events, artifacts, errors, secrets, and append-only audit entries.
- **Command Center** owns read-only projections of active sessions and attention states. It does not write configuration.

### End-to-End Flow

1. The user validates the registered workspace connector and workspace path.
2. Capability Registry records a skill reference and an HTTP MCP with `connection_origin: environment`; validation runs from the connector so VPN-only reachability is measured from the actual execution network.
3. Agent Registry creates a draft, attaches both capabilities, validates compatibility, publishes to OpenAI, and stores the returned ID plus immutable local version.
4. Session Runner writes the local session and redacted effective snapshot before any external call, then creates the OpenAI self-hosted session.
5. The connector receives a narrowly scoped start instruction and launches `codex exec-server` with only the returned remote URL, environment ID, approved workspace path, and restricted executor credential.
6. Session Runner persists each upstream event before projecting it. Browser SSE replays from the last acknowledged local sequence and then follows live events.
7. Artifact reports create distinct artifact rows keyed by their source report event, even when file paths match. Path validation ensures the resolved file remains inside the workspace and ends in `.md`.
8. Command Center reads active-session projections. Terminal sessions leave the live canvas and remain available through session history, trace, artifact, and audit views.

### Internal Service Boundaries

- `CapabilityReadinessPort` returns redacted, resolved capability configuration and health; it cannot mutate Agent Registry data.
- `PublishedAgentPort` returns one immutable published version for session start.
- `WorkspaceExecutionPort` validates the workspace and starts/stops only the official executor for a known session.
- `SessionEvidencePort` appends raw events, normalized events, artifacts, errors, snapshots, and audit entries through Observability and Governance.
- `LiveFleetProjectionPort` exposes active-session projections to Command Center without direct access to Session Runner tables.

## Testing Strategy

- Unit-test state transitions, redaction, path containment, capability compatibility, OpenAI payload mapping, and event normalization.
- Run module integration tests with PostgreSQL for publish transactions, append-only audit, immutable versions, snapshot preservation, event idempotency, artifact-report identity, and terminal-state handling.
- Test the OpenAI adapter against recorded fixtures and a protocol-faithful fake; keep one opt-in live smoke test for agent publication, self-hosted environment connection, environment-origin MCP, and artifact reporting.
- Contract-test every JSON route and normalized SSE event against `contracts/`.
- Use Playwright for the complete user path and for invalid capability, disconnected connector, interrupted stream, canceled session, and secret-redaction cases.
- Verify Command Center never shows completed sessions on the live canvas and never becomes a configuration surface.

## Complexity Tracking

No constitution violations. The workspace connector is necessary because the official self-hosted session contract assigns each session its own environment ID and executor; it is constrained to launching the official executor and cannot run arbitrary user-supplied commands.
