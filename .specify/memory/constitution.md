# ADLC Constitution

## Core Principles

### I. General Fleet Control Plane
ADLC MUST be designed as a general AI SDLC agent fleet control plane, not as a
single-scenario product. Example workflows such as incident response, product
planning, architecture, development, review, QA, and release may guide demos and
tests, but product language, data models, and user experience MUST remain reusable
across SDLC workflows. R0 MUST prove the reusable primitives: agent registry,
capability registry, workspace environment settings, workflow orchestration,
session running, observability, approvals, artifacts, and platform chat.

### II. OpenAI-Managed Execution, ADLC-Owned Control
R0 MUST use OpenAI Agents API as the managed agent and session execution
substrate. ADLC MUST NOT build a custom agent runtime or agent harness in R0.
ADLC owns the control plane around execution: local configuration, workflow state,
approval boundaries, artifact metadata, operational dashboards, platform chat, and
audit history. R0 execution MUST use a single workspace-wide self-hosted
environment. OpenAI-hosted environments and multiple environment profiles are out
of R0 scope unless a later amendment explicitly adds them.

### III. Agent-Owned Capability and Validation
Agent definitions MUST own persona, instructions, skills, MCP/capability
attachments, and risky-action approval policy. Skills and MCP servers MUST be
registered once in the Capability Registry and attached to agents by reference.
At session start, ADLC resolves the published agent definition and injects or
copies the attached skills and MCP/tool configuration into the session context.
Step readiness checks, missing-input detection, and output validation belong
primarily to the configured agent through its instructions, skills, and
capabilities. Workflow rules MUST NOT duplicate each agent's domain validation
logic.

### IV. Orchestrated Sequential Workflows
R0 workflows MUST be understandable sequential flows, with support for
orchestrator-mediated returns to earlier steps when an agent raises findings,
blockers, questions, or failed validation outcomes. Agents MUST NOT route directly
to other agents or directly ask humans for workflow-critical decisions. Agents
report needs to the Workflow Orchestrator, and the orchestrator owns transition
decisions, pending actions, resume behavior, and auditability. Explicit human
approval steps are workflow configuration. Risky external action approvals are
configured on agent definitions using coarse modes such as always allow, ask for
risky actions, or always ask.

### V. Auditable System Agents and Execution History
R0 MAY include ADLC-managed system agents implemented through OpenAI Agents API,
including separate Platform Chat and Workflow Orchestrator agents. System agents
are internal platform components, not normal user-created Agent Registry records.
The Workflow Orchestrator Agent may use AI to decide workflow transitions, but it
MUST be conservative: ambiguous, risky, or user-intent-dependent transitions
become pending actions. Every AI-selected transition MUST be recorded with source
context, rationale, selected next state, and audit metadata. Every execution MUST
store the effective redacted configuration snapshot needed to explain the run
history, including workflow structure, agent settings, selected skills, MCP/tool
configuration, approval modes, artifact references, and runtime options.

### VI. Vertical Slice Delivery
Every feature spec MUST deliver a user-visible increment, including its user
interface surface, that a reviewer can operate in a running system. A spec MUST
NOT be accepted on evidence produced solely against mocks, fakes, in-memory
substitutes, or directly instantiated services standing in for the boundaries the
spec claims to prove. Claims about persistence MUST be proven against the real
database, claims about API behavior MUST be proven across the real HTTP boundary,
and claims about user-facing behavior MUST be proven against the real API rather
than intercepted requests. Backend-only or UI-only work is permitted only when a
spec names it explicitly as enabling work, and that work MUST be consumed by a
visible slice within the same release. Verification reports MUST disclose which
boundaries were exercised with substitutes, and MUST NOT record a passing result
for a requirement whose real boundary was never crossed.

### VII. Binding Visual Design System
The Command Center visual language is a product contract, not optional
inspiration. Frontend-facing work MUST implement the tokens, typography, status
semantics, shell geometry, motion rules, and component recipes documented in
`docs/07-frontend-ui-guidelines.md`,
`apps/Debate AI SDLC Command Center UI/DESIGN_SYSTEM.md`, and
`apps/Debate AI SDLC Command Center UI/src/DesignSystem.tsx`.

Shipping CSS variables or column widths without those primitives is not
compliance. Production screens MUST use the documented recipes as live
`@adlc/ui` primitives: StatusDot, Badge, ID chips, ALL-CAPS section labels,
icon rail, entity rows, button variants, Field / FormSection, creation
workspace, and validation panel. Styling MUST use Tailwind v4 utility classes
that match `DesignSystem.tsx`. Inline `style` objects MUST NOT encode static
design tokens.

The prototype `App.tsx` is a composition example and MUST NOT be copied
wholesale as application source. Extract the primitives into `@adlc/ui`;
feature pages in `apps/web` own routes and data only. A later slice MUST NOT
invent a second accent color, a new status family, or a competing component
language unless this constitution and the design-system documents are amended
first.

## R0 Product Boundaries

The Command Center MUST be an operational status surface. It shows active
sessions, running workflows, pending approvals and actions, failures, recent
activity, artifacts, and fleet health. Configuration of agents, workflows,
capabilities, and workspace environment settings MUST happen in their own
dedicated screens. The Command Center may link to those screens but MUST NOT
become the primary configuration surface.

Platform Chat MUST be a built-in ADLC-managed system agent. It MUST answer
questions grounded in platform data and MAY assist users in creating or editing
agents, workflows, capabilities, and workspace settings through guided,
step-by-step configuration. State-changing chat actions MUST present a review
summary, require explicit human confirmation, create normal platform entities,
and be recorded in audit history. Platform Chat-created agents MUST start as
drafts. Edits to published agents MUST be staged as draft changes until a
separate publish confirmation.

Workflow steps MUST reference published agents. Draft agents MUST NOT run inside
workflows. Published agent definitions may be updated in place in R0, but every
session or workflow run MUST snapshot the effective agent configuration used at
execution time. Workflow definitions, capability references, skill versions, MCP
configuration, and artifact references used by a run MUST be snapshotted or
otherwise preserved with enough redacted detail to explain past behavior.

R0 MUST treat Markdown artifacts as first-class workflow handoff outputs. Agents
produce artifacts as `.md` files in the shared self-hosted workspace filesystem.
Artifact organization paths and naming conventions are controlled by each agent's
configured skills and instructions. ADLC stores artifact metadata, provenance,
file references, statuses, and producer/consumer relationships. The orchestrator
passes artifact paths or references between workflow steps by default, not full
artifact contents.

Dedicated usage and cost dashboards, budgets, advanced analytics, starter agent
templates, unrestricted natural-language workflow generation, detailed per-tool
policy matrices, multiple environment profiles, OpenAI-hosted environments, and a
custom ADLC-owned agent runtime are outside R0 scope.

## Development and Specification Workflow

All feature specifications MUST preserve the R0 boundaries in this constitution
unless the constitution is amended first. Product specs MUST separate user-facing
behavior from implementation details, and MUST make approval, audit, artifact,
and workflow-state behavior explicit when affected.

Every feature directory MUST contain a `demo.md` that records the exact click
path a reviewer follows to see the increment in a running system, the observable
outcome at each step, and the setup required beforehand. The demo script is
written during specification, not after implementation, and a spec is not
accepted until a reviewer can follow it successfully.

Frontend-facing specifications MUST comply with
`docs/07-frontend-ui-guidelines.md` and with the design-system documents named
in Principle VII unless those documents are explicitly amended. App screens MUST
preserve the sliced workspace shell, operational density, status semantics,
component recipes, and persistent Platform Chat behavior defined there.
Extracting only hex colors or layout sizes from those documents is not
compliance. Claims about user-facing appearance MUST be reviewable in the
running browser against the documented recipes, not inferred from the existence
of unused CSS variables.

Implementation planning MUST keep the modular-monolith direction from the project
docs unless superseded by an accepted ADR. Module boundaries MUST remain explicit:
Agent Registry, Capability Registry, Workflow Orchestrator, Session Runner,
Platform Chat, Observability and Governance, Command Center, and Workspace
Environment Settings. Cross-module writes MUST happen through explicit
application services, and secrets MUST never be exposed to the browser or stored
in plain text.

Tests for R0 features MUST cover the product contract being changed. Workflow,
approval, system-agent, artifact, snapshot, and audit behavior require
integration-level tests because they define cross-module trust boundaries. UI
tests MUST verify that configuration and operational status remain distinct
surfaces. At least one test path per feature MUST run the browser against the
real API and the real database so the golden path cannot pass while the assembled
system is broken.

## Governance

This constitution supersedes conflicting product, architecture, and feature
specification decisions for ADLC. Any feature spec, implementation plan, task
list, or code change that contradicts these rules MUST first amend this
constitution or explicitly defer the contradictory behavior out of scope.

Amendments require a documented rationale, a summary of affected principles or
sections, and review of existing specs, module plans, and ADRs for required
updates. Version changes follow semantic versioning: MAJOR for governance changes
that invalidate existing specs or product boundaries, MINOR for added or
materially expanded principles, and PATCH for clarifications that do not change
meaning.

Every Spec Kit flow MUST check this constitution before proceeding. Constitution
compliance is required during specification review, implementation planning, task
breakdown, and code review. When in doubt, prefer the simpler R0 boundary and
defer expansion until real workflow usage proves the need.

**Version**: 1.2.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-19
