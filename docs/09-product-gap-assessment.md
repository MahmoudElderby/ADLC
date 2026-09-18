# Product Owner Gap Assessment and Long-Term Spec Plan

Date: 2026-09-18

Owner: Product (ADLC)

Reviewed artifacts: `.specify/memory/constitution.md` (v1.0.0), `docs/01`–`docs/08`,
`docs/adr/0001`, all `docs/modules/*`, `specs/README.md`, and every artifact in
`specs/001-r0-agent-fleet-skeleton/`, checked against the code in `apps/`,
`packages/`, and `tests/`.

## 1. Verdict

Spec 001 produced a credible **backend domain model** and a **passing test suite**,
but it did not produce a **product increment anyone can see**. R0 today is not
demoable: there is no app shell, no design system, no persistence, no real OpenAI
call, and no live stream in the browser.

The root cause is not developer error. It is a **specification and
definition-of-done defect**: spec 001 bundled the entire R0 promise into one
feature, and its acceptance evidence could be satisfied without a working system.

## 2. The core process gap

Spec 001's Playwright tests pass while mocking the API, and its integration tests
pass while instantiating services directly against in-memory stores. Neither path
ever exercises the real HTTP boundary.

The proof: `apps/web/src/lib/api.ts` sends only `Accept: application/json`, while
`apps/api/src/platform/auth/workspace-user.guard.ts` is a **global** guard
requiring `x-adlc-workspace-id` and `x-adlc-actor-id`. Every API-backed page in
the web app would return 401 against the real API. `verification.md` nonetheless
records PASS on eleven checks.

That combination means the walking skeleton was never walked.

### Constitution amendment (v1.1.0, ratified 2026-09-18)

Added as a sixth principle, **VI. Vertical Slice Delivery**:

- Every feature spec MUST deliver a user-visible increment, including its UI
  surface, that a reviewer can operate in a running system.
- A spec MUST NOT be accepted on evidence produced solely against mocks, fakes,
  or in-memory substitutes for the boundaries it claims to prove.
- Every spec MUST include a `demo.md` script: the exact click path a reviewer
  follows to see the increment, and the observable outcome at each step.
- Backend-only or UI-only specs are permitted only for explicitly named
  enabling work, and MUST be consumed by a visible slice in the same release.

This is the direct answer to "after each spec we should have something valuable
we can see end to end including the UI/UX."

## 3. Gaps against the constitution

| # | Constitution requirement | Status | Gap |
|---|---|---|---|
| G1 | Frontend specs MUST comply with `docs/07-frontend-ui-guidelines.md`; screens MUST preserve the sliced workspace shell | **Violated** | No shell, no icon rail, no entity column, no chat panel, zero CSS files, zero design tokens. The mandated dark graphite palette and status semantics exist only in docs. |
| G2 | R0 MUST prove the reusable primitives, including **workflow orchestration**, **approvals**, and **platform chat** | **Not specified** | Spec 001 explicitly defers all three. No spec covers them, so three constitutional R0 primitives have no plan. |
| G3 | Platform Chat MUST be a built-in ADLC-managed system agent | **Missing** | Docs only (`docs/modules/platform-chat.md`). |
| G4 | R0 MUST use OpenAI Agents API as the execution substrate | **Faked** | `openai-agents.adapter.ts` and `openai-session.adapter.ts` return synthetic IDs and a `.example.test` URL. No outbound HTTP. |
| G5 | Every execution MUST store the effective redacted configuration snapshot | **Not durable** | Snapshots live in process `Map`s; lost on restart. Audit history is a JS array, not append-only storage. |
| G6 | Secrets MUST never be exposed to the browser or stored in plain text | **At risk** | Open task T089: MCP and runtime secrets are held in plaintext maps. Redaction is tested only against fakes. |
| G7 | Command Center MUST be an operational surface, configuration in dedicated screens | **Partially met** | Correct in principle, but most "dedicated screens" do not exist, so the separation is untested in practice. |
| G8 | Cross-module writes through explicit application services; each table one owning module | **Met in design, unproven** | Ports are defined and respected, but no table is actually written, so ownership is theoretical. |
| G9 | Workflow steps MUST reference published agents; drafts MUST NOT run | **Unenforceable** | No workflow module exists. |

## 4. Gaps against the R0 roadmap

`docs/05-roadmap.md` lists twelve R0 inclusions. Assessed against code:

| R0 item | State |
|---|---|
| Workspace setup with OpenAI project/API key | **Missing** — spec 001 *assumes* credentials are already configured. No spec owns the onboarding flow. |
| Agent Registry | Backend real, UI local-state only |
| Capability Registry (MCPs, skills) | Backend real, UI local-state only |
| Workspace Environment Settings | Hardcoded values, no persistence, no connector runtime |
| Session Runner with streaming | Backend SSE real; **no browser consumer** |
| Command Center Dashboard | Read-only page, unstyled, not live |
| Live Agent Fleet Canvas | Plain cards with inline `minHeight`; not a canvas, not live |
| Platform Chat for status queries | **Missing** |
| Session/event persistence | **Missing** — in-memory |
| Markdown artifact metadata and handoff | Provenance logic real; no real file validation |
| Basic approval queue | **Missing** |
| Simple workflow builder | **Missing** |

Four of twelve R0 items have no specification at all, and one more (credential
onboarding) was assumed away rather than scoped.

## 5. Gaps against the architecture and module plans

- **Persistence unwired.** `packages/database` has five migrations and a full
  Drizzle schema. `DatabaseModule` is never imported into `AppModule`. The
  documented single-transaction boundary — the main stated benefit of the
  modular monolith in `docs/03-main-architecture.md` — is not in effect.
- **Queue unwired.** `pg-boss` is configured in `platform/queue` and never used,
  so there is no async path for connector dispatch or event ingestion.
- **Connector is a scaffold.** `apps/workspace-connector/src/main.ts` logs a
  readiness message. The heartbeat and command long-poll endpoints in
  `contracts/connector-protocol.md` are unimplemented (T096, T097).
- **`packages/ui` is a stub** exporting a single string, so there is nowhere for
  shared shell and status primitives to live.
- **No real identity.** Auth is a trusted header pair. `docs/03` calls for
  workspace-level auth with email or external provider; nothing specifies it.
- **Two mandated product areas have no screen at all:** Settings and a
  standalone Traces area. Artifacts exists only nested inside session
  investigation.

## 6. Artifact hygiene issues

These are cheap to fix and currently misleading:

1. `specs/README.md` records spec 001 as `Spec Draft` with next action
   "run `$speckit-plan`", while the code is in Phase 7 convergence. The
   registry rules in `docs/08-spec-tracking.md` make updating this mandatory.
2. `spec.md` header still says `Status: Draft` and
   `Feature Branch: Not created`, though work is committed on `master`.
3. `verification.md` reports blanket PASS without disclosing that the evidence
   is mock-backed and that seventeen convergence tasks remain open.
4. Success criteria SC-001 through SC-008 are written as measurable outcomes but
   nothing measures them. No spec owns the acceptance run.

## 7. Rejected first draft of the spec plan

The first version of this section proposed nine specs: a shell spec, then
"Identity, Workspace Setup, and Durable State", then "Real Execution and Live
Streaming", then approvals, artifacts, chat, workflows, and a closing
"Acceptance Hardening" spec. It is recorded here as rejected, because reviewing
it against the very failure it was meant to prevent exposed four defects.

**Defect 1 — it repeated spec 001's anti-pattern.** "Identity, Workspace Setup,
and Durable State" and "Acceptance Hardening" are horizontal layers wearing
feature costumes. Their demos would have been technical, not valuable: *restart
the API and the data is still there* is table stakes, not an increment a
stakeholder cares about. Slicing by layer is exactly what produced a tested
backend nobody can use, and a "hardening" spec at the end is where quality goes
to be deferred.

**Defect 2 — it ordered by visibility and ignored risk.** The single largest
unknown in the project is whether the real OpenAI self-hosted session,
`codex exec-server`, and VPN-only MCP path behave the way
`docs/04-openai-integration.md` assumes. That entire path is stubbed today and
has never been executed once. The draft deferred it to the third spec, behind
substantial UI investment. If the assumption is wrong, it invalidates plan
decisions and threatens Principle II, and the UI built on top of it is partly
wasted. Highest technical risk must be retired first.

**Defect 3 — the shell spec violated the new Principle VI.** A shell wrapping
pages whose data is hardcoded `useState` is chrome around a lie. It is visible
but not valuable, and it is a UI-only spec with no vertical slice consuming it.

**Defect 4 — approvals were sequenced against Constitution IV.** Principle IV
states that explicit human approval steps *are workflow configuration*.
Specifying an approvals feature before the Workflow Orchestrator exists means
specifying half of it twice. The draft also conflated two genuinely separate
things: agent-level risky-action approval modes, which belong to agent
configuration and the execution slice, and workflow human-approval gates, which
belong to workflows.

## 8. Long-term spec plan

Sequencing principles, in priority order:

1. Retire the highest technical unknown before building on top of it.
2. Slice by **entity and user outcome**, never by architectural layer.
3. Persistence, real audit, and a real API boundary are **done-criteria of every
   slice**, not specs of their own.
4. Every spec ends in a demo a stakeholder would care about watching.

Spec 001's domain logic and tests are kept; nothing below rewrites completed
work. The seventeen convergence tasks are distributed to the slice that owns
each entity.

### SPIKE-001 — Real Execution Path Proof (enabling, timeboxed)

Not a product spec, and deliberately held to a different acceptance bar. A
timeboxed investigation that publishes one real agent to the OpenAI Agents API,
opens one real self-hosted session, calls one real VPN-reachable MCP server, and
has the agent write one real `.md` file — driven from a script, with no UI.

**Deliverable**: a findings document confirming or correcting
`docs/04-openai-integration.md` and `contracts/connector-protocol.md`, plus the
recorded transcript.

**Gate**: if the documented contract does not hold, this becomes an ADR and a
constitution review before any further execution work is planned.

**Why first**: it is the only unknown that can invalidate the plan. It runs in
parallel with 002 because it touches no shared code.

### 002 — Cockpit Shell and the Capability Registry, For Real

The shell from `docs/07-frontend-ui-guidelines.md` — top bar, icon rail, entity
column, main workspace, reserved collapsed chat panel — plus design tokens,
status semantics, and entity-browser and creation-workspace primitives in
`packages/ui`. Then one complete vertical through it: **skills and MCP servers**,
wired to the real API, persisted in PostgreSQL, with real append-only audit and a
real login replacing the trusted header pair.

Absorbs T089, T090, T091, and the minimum real identity needed to attribute an
audit entry. Includes the first browser test that runs against the real API and
real database, satisfying Principle VI.

**Demo**: log in, register a skill and an MCP server in the cockpit, watch
validation resolve, restart the API, find both still there, and open an audit
entry that names you.

**Why the pairing**: the shell alone would be chrome around hardcoded pages. One
real entity family proves the shell, the persistence, the auth, and the audit
boundary in a single demo, and every later slice inherits all four.

### 003 — The Agent Registry, For Real

Draft creation, capability attachment, the review panel that distinguishes
blocking errors from warnings, publication to the real OpenAI Agents API,
immutable published versions, and the agent detail tabs. Absorbs T092 and
replaces the stubbed agents adapter with the integration SPIKE-001 validated.

**Demo**: build an agent from registered capabilities, be blocked from
publishing an invalid one with actionable errors, publish a valid one, and see
the immutable version record and its OpenAI identifier.

### 004 — Live Session Execution

The connector command loop and heartbeat, `codex exec-server` dispatch, real
session creation, upstream event ingestion, the four distinct terminal states,
real Markdown path validation and artifact records, agent-level risky-action
approval modes including `always_allow`, and the browser SSE consumer that drives
session progress and makes the live fleet canvas actually live. Absorbs
T093–T099, T101, T102, T103.

**Demo**: start a real session, watch tool calls stream into the trace as they
happen, see the agent node live on the fleet canvas, watch it reach a terminal
state and leave the canvas, then open the `.md` file it genuinely wrote.

This is the point at which the R0 product promise in `docs/01-product-thesis.md`
first becomes true.

### 005 — Operational Investigation Surfaces

Session history, trace, investigation, and audit views rebuilt in the shell
against real data, plus a standalone Artifacts area with cross-session
provenance and Markdown preview, a standalone Traces area, and Command Center
attention states for failures. Most of the backend already exists from spec 001;
this slice makes it reachable and trustworthy.

**Demo**: a run failed overnight — find it from Command Center, reconstruct what
happened from the trace and configuration snapshot, reach the artifact it
produced, and identify who started it.

### 006 — Sequential Workflows with Human Approval Gates

The Workflow Orchestrator module, a builder canvas over published agents,
sequential runs with orchestrator-owned transitions and recorded rationale,
artifact path handoff between steps, human approval steps as workflow
configuration, and the Approvals area with queue and decision history. Merges
what the rejected draft split across two specs, per Constitution IV.

**Demo**: a two-step workflow where one agent writes `plan.md`, a human approves
at the gate, and a second agent reviews the artifact — with the handoff, the
decision, and every transition visible and audited.

### 007 — Platform Chat, Grounded and Read-Only

Platform Chat as an ADLC-managed system agent answering from platform data, with
the context strip and navigation action buttons, occupying the panel 002
reserved. State-changing chat actions are deferred to R1 with the confirmation
and audit boundary the constitution requires.

**Demo**: ask "what is running now" and "why did session 3 fail", then click
straight through to the trace.

**Why last**: chat's value scales with the amount of platform state worth asking
about. Built earlier it would have nothing to ground itself in.

### R0 release readiness

Not a spec. A `$speckit-checklist` run that measures SC-001 through SC-008
against the assembled system and gates the release. Each success criterion is
owned and measured by the slice that introduces it, so no quality work waits for
a closing phase.

### R1 and beyond

`docs/05-roadmap.md` R1–R3 remain valid. The first R1 candidates are
state-changing Platform Chat configuration, workflow templates with
input/output mapping, and multi-agent runs.

## 9. Recommended immediate actions

1. ~~Amend the constitution to v1.1.0 with the Vertical Slice Delivery
   principle.~~ Done: constitution is at v1.1.0 with Principle VI, a mandatory
   `demo.md` per feature directory, and a required real-API/real-database test
   path.
2. ~~Correct `specs/README.md` and the `spec.md` header, and annotate
   `verification.md` with the mock-backed caveat and the open tasks.~~ Done.
3. Start SPIKE-001 now. It is the only unknown that can invalidate the plan, and
   it blocks nothing else.
4. Run `$speckit-specify` for 002 in parallel with the spike.
5. Distribute T089-T105 across slices 002 through 005 per the mapping below, and
   retire Phase 7 as a standalone backlog so no work sits unbounded.
6. Do not begin workflows, approvals, or Platform Chat until 004 makes a real
   session run, since all three consume real execution state.

## 10. Task-to-slice mapping

| Slice | Convergence tasks absorbed |
|---|---|
| 002 Cockpit shell and Capability Registry | T089, T090, T091, T104, T105, the capability halves of T099 and T100, and the environment registration and check-in portion of T096 |
| 003 Agent Registry | T092 and the agent-editor half of T100 |
| 004 Live session execution | T093, T094, T095, T097, T098, T102, T103, the executor-dispatch remainder of T096, the artifact half of T099, the session half of T100 |
| 005 Operational investigation surfaces | T101 |

Slice 002's clarification session moved environment reachability probing forward
from 004, because reporting a platform-service reachability result would have been
untruthful for VPN-only MCP servers — the exact case the constitution's
environment-origin rule exists to serve. Slice 002 delivers environment
registration, check-in, and answering platform-issued checks only; it delivers
nothing that executes agent work. See
`specs/002-cockpit-shell-capabilities/checklists/requirements.md`.
