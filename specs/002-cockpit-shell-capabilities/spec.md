# Feature Specification: Cockpit Shell and the Capability Registry, For Real

**Feature Branch**: `Not created (no branch hook configured)`

**Created**: 2026-09-18

**Status**: Done (accepted 2026-09-18 with SC-012 B caveat; see `verification.md`)

**Input**: User description: "Deliver the operational cockpit shell and one complete vertical through it: an authenticated user registers skills and MCP servers that are durably stored, validated, audited, and free of exposed secrets."

## Context

This is slice 002 in the plan recorded in `docs/09-product-gap-assessment.md`. Spec
001 produced working capability, agent, and session domain logic that no user can
reach: there is no workspace shell, nothing is stored durably, identity is
asserted by the browser rather than established by the platform, and the only
passing browser evidence intercepts the API.

This feature makes the platform real for the first time by pairing the workspace
shell with one complete entity family. The shell alone would be decoration over
placeholder data. One durable, audited, secret-safe entity family proves the
shell, the identity boundary, the storage boundary, and the audit boundary in a
single reviewable demo, and every later slice inherits all four.

Governing documents: `.specify/memory/constitution.md` v1.2.0 (Principle VI
requires an operable increment and forbids acceptance on mocked evidence;
Principle VII binds the visual design system),
`docs/07-frontend-ui-guidelines.md`,
`apps/Debate AI SDLC Command Center UI/DESIGN_SYSTEM.md`, and
`apps/Debate AI SDLC Command Center UI/src/DesignSystem.tsx`.

## Clarifications

### Session 2026-09-18

- Q: Should the navigation rail show all product areas from the UI guidelines with not-yet-available states, or only the areas that have working screens? → A: Only areas with working screens; each later slice adds its own area, so the rail never contains a dead end.
- Q: Where should MCP reachability be measured in this slice? → A: From the real execution environment. This slice delivers the minimum environment-side probe needed to measure it truthfully, rather than reporting a platform-service result that would mislead about VPN-only servers.
- Q: Which sign-in method should R0 use? → A: A single pre-provisioned operator account. This is the smallest change that moves identity from a browser claim to a platform-established fact; multi-user accounts and external providers are deferred.

### Session 2026-09-19

- Q: Is the in-repo design system (`DESIGN_SYSTEM.md` + `DesignSystem.tsx`) binding for this slice, or may implementation extract only tokens and shell sizes? → A: Binding. Constitution v1.2.0 Principle VII. Tokens and geometry alone are not compliance; live screens MUST use the documented primitives (icon rail, StatusDot, Badge, ID chips, ALL-CAPS labels, Field / FormSection, button variants, creation workspace, validation panel). Functional acceptance of 002 still stands; the visual contract is amended in place rather than deferred to a later spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter the Cockpit as a Known User (Priority: P1)

As a platform engineer, I sign in to my workspace and land in an operational
cockpit where I can see the product areas available to me, move between them
predictably, and know that the platform knows who I am.

**Why this priority**: Nothing else in the product can be trusted or attributed
until the platform establishes identity itself and presents a stable workspace
frame. This story is the enabling frame that User Stories 2 and 3 are delivered
through, satisfying the Principle VI requirement that enabling work be consumed
by a visible slice in the same release.

**Independent Test**: A tester with valid workspace credentials and an empty
workspace can sign in, navigate every available product area, collapse and expand
the assistant panel, reload the page on a deep link, and sign out — confirming the
shell matches `docs/07-frontend-ui-guidelines.md` and
`DesignSystem.tsx` (icon rail, status primitives, typography, button and field
recipes) and that no workspace data is reachable before signing in.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they request any workspace
   screen or workspace data directly, **Then** access is refused and they are
   directed to sign in, and no workspace content is disclosed.
2. **Given** valid credentials, **When** the user signs in, **Then** they land in
   the cockpit with the persistent navigation rail, entity column, main
   workspace, and assistant panel present, and their identity is shown.
3. **Given** an authenticated user, **When** they select a product area from the
   navigation rail, **Then** the entity column switches to that area's objects
   and the main workspace shows that area, without losing the assistant panel.
4. **Given** the assistant panel is expanded, **When** the user collapses or
   hides it, **Then** the main workspace reclaims the space rather than being
   overlaid, and the choice persists across navigation and reload.
5. **Given** any area, entity, or creation view, **When** the user copies the
   address and reopens it, **Then** the same view is restored for an
   authenticated user and refused for an unauthenticated one.
6. **Given** an authenticated user, **When** their session expires or they sign
   out, **Then** further workspace requests are refused until they sign in again.

---

### User Story 2 - Register a Skill That Is Still There Tomorrow (Priority: P2)

As a platform engineer, I register a reusable skill in the Capability Registry,
see it validated, and find it unchanged with a record of who added it after the
platform restarts.

**Why this priority**: The skill is the simplest reusable capability and the
cheapest way to prove the full write path — creation surface, durable storage,
validation feedback, and attributable audit — end to end.

**Independent Test**: Starting from an empty registry, a tester can create a
skill through the creation workspace, observe live validation, save it, restart
the platform, and find the skill and its audit entry intact and attributed to the
signed-in user.

**Acceptance Scenarios**:

1. **Given** an empty Capability Registry, **When** the user starts skill
   creation from the entity column, **Then** a creation workspace opens in the
   main workspace area with the entity column and assistant panel still visible,
   and no modal dialog is used.
2. **Given** the creation workspace, **When** the user edits fields, **Then**
   validation feedback updates live, blocking errors are distinguished from
   non-blocking warnings, and a configuration preview reflects the current form
   state.
3. **Given** required information is missing or invalid, **When** the user
   attempts to save, **Then** saving is refused with actionable messages
   identifying each problem.
4. **Given** a valid skill, **When** the user saves it, **Then** it appears in
   the entity column with its status, and the action is recorded as an audit entry
   naming the user, the action, the affected skill, and the time.
5. **Given** a saved skill, **When** the platform is restarted, **Then** the skill
   and its audit history are unchanged and still attributed to the original user.
6. **Given** a saved skill, **When** the user edits it, **Then** the change is
   applied and recorded as an additional audit entry without replacing or
   altering the earlier entry.
7. **Given** any recorded audit entry, **When** anyone attempts to modify or
   remove it, **Then** the attempt is refused and the entry remains intact.

---

### User Story 3 - Register an MCP Server Without Handling Its Secret (Priority: P3)

As a platform engineer, I register a remote MCP server with its allowed tools and
a referenced credential, see whether it is reachable, and confirm that its secret
value is never shown back to me or stored readably.

**Why this priority**: The MCP server is the first capability that carries a
secret and an external dependency, so it is where the platform's security and
validation promises become visible. It builds on the write path proven by User
Story 2.

**Independent Test**: A tester can register an MCP server with a credential
reference, observe its reachability status resolve from the workspace's own
execution environment, take that environment offline and confirm a newly
registered server reports unverified rather than a guess, inspect every screen and
response available to the browser to confirm no secret value appears, and confirm
the stored credential is unreadable at rest.

**Acceptance Scenarios**:

1. **Given** the Capability Registry, **When** the user registers an MCP server
   with a label, address, allowed tools, connection origin, required flag, and
   credential reference, **Then** it appears with its validation and reachability
   status and its connection origin clearly shown.
2. **Given** a registered MCP server, **When** the user views it anywhere in the
   product, **Then** only the credential reference and its health are shown, and
   no credential value is displayed.
3. **Given** a stored MCP credential, **When** the underlying stored record is
   inspected, **Then** the credential value is not readable in plain text.
4. **Given** a label already used in the workspace, **When** the user tries to
   reuse it, **Then** registration is refused with a message identifying the
   conflict.
5. **Given** an MCP server that cannot be reached, **When** validation runs,
   **Then** the failure is reported with an actionable reason and the record is
   retained in an unhealthy state rather than discarded.
5a. **Given** an MCP server reachable only through the workspace's private
   network, **When** validation runs, **Then** it is reported reachable because
   the check was performed from the workspace's own execution environment.
5b. **Given** the execution environment is unavailable, **When** the user
   registers or revalidates an MCP server, **Then** the capability is saved with
   its reachability reported as unverified, the reason is shown, and the user can
   revalidate once the environment returns.
6. **Given** a validation failure caused by an external error message containing
   text resembling a secret, **When** it is shown to the user or recorded,
   **Then** the secret-like text is redacted.
7. **Given** a capability referenced by an agent, **When** the user attempts to
   remove it, **Then** removal is refused and the referencing agents are
   identified.

### Edge Cases

- An unauthenticated visitor deep-links to a creation view or an entity address.
- A user's session expires while a creation form holds unsaved input.
- Two browser tabs edit the same capability, and the second save would silently
  overwrite the first.
- The platform restarts midway through a registration that was never saved.
- A skill declares compatibility that the workspace environment does not offer.
- An MCP address is syntactically valid but points somewhere unreachable, or is
  reachable but rejects the referenced credential.
- The referenced credential is missing, revoked, or unhealthy.
- The execution environment is offline or has never checked in when a capability
  is registered, so no reachability answer can be obtained.
- The execution environment reports reachability for a check the platform never
  requested, or reports one long after the request has become irrelevant.
- The MCP server responds but advertises none of the allowed tools that were
  configured.
- An external validation error payload embeds a credential-like string.
- The entity column holds far more capabilities than fit on screen.
- A capability is referenced by an agent that was published before this feature.
- The assistant panel is hidden when a screen wants to draw attention to it.
- A status arises that does not obviously belong to an existing status family.

## Requirements *(mandatory)*

### Functional Requirements

#### Identity and Access

- **FR-001**: The system MUST refuse all access to workspace screens and workspace
  data until the requester has been authenticated, and MUST disclose no workspace
  content in the refusal.
- **FR-002**: The system MUST establish the acting user's identity itself from an
  authenticated session, and MUST NOT accept the browser's assertion of which
  workspace or user it is acting as.
- **FR-003**: The system MUST allow the workspace's pre-provisioned operator
  account to sign in, see which identity and workspace it is operating in, and
  sign out. Self-service account creation MUST NOT be offered in this slice.
- **FR-004**: The system MUST expire inactive authenticated sessions and MUST
  refuse workspace requests made with an expired session.
- **FR-005**: Every state-changing action in this feature MUST be attributed to
  the authenticated user who performed it.

#### Workspace Shell

- **FR-006**: The application MUST present the sliced workspace shell defined in
  `docs/07-frontend-ui-guidelines.md` and `DESIGN_SYSTEM.md`, with a persistent
  top bar, icon navigation rail, entity column, main workspace, and assistant
  panel, using the `@adlc/ui` primitives specified by `DesignSystem.tsx`.
- **FR-007**: The assistant panel MUST support expanded, collapsed, and hidden
  states, MUST resize the main workspace rather than overlay it when expanded, and
  MUST remember the user's choice across navigation and reload.
- **FR-008**: Selecting a product area MUST change both the entity column
  contents and the main workspace, and selecting an entity row MUST open that
  entity in the main workspace.
- **FR-009**: Entity creation MUST open a creation workspace in the main
  workspace area with the entity column and assistant panel still visible, and
  MUST NOT use a modal dialog as the primary creation surface.
- **FR-010**: Every product area, entity view, and creation view MUST be
  addressable by a shareable link that restores the same view for an authorized
  user.
- **FR-011**: Status MUST be expressed only through the status families defined in
  `docs/07-frontend-ui-guidelines.md` and `DESIGN_SYSTEM.md`, applied consistently
  across StatusDot, Badge, entity rows, and headers; new states MUST be mapped
  into an existing family.
- **FR-012**: The interface MUST distinguish human-facing copy from
  machine-facing metadata as defined in `DESIGN_SYSTEM.md` (Inter vs JetBrains
  Mono), MUST use ALL-CAPS section labels and monospace ID chips, and MUST
  compose screens from the documented Field, FormSection, button, and
  validation-panel recipes rather than unstyled native controls.
- **FR-013**: Configuration surfaces and operational status surfaces MUST remain
  visibly distinct areas, and configuration MUST NOT be performed from the
  operational cockpit view.
- **FR-014**: The navigation rail MUST expose only product areas that have a
  working screen, so that no navigation target leads to an unavailable or empty
  placeholder area. Later slices add their own areas as they deliver them.

#### Capability Registry — Skills

- **FR-015**: The system MUST allow an authenticated user to register a reusable
  skill with the descriptive, source, version, and environment-compatibility
  information needed to identify and validate it.
- **FR-016**: The system MUST allow a user to view, list, and edit registered
  skills, showing each skill's status in the entity column.
- **FR-017**: The system MUST show live validation while a capability is being
  edited, MUST distinguish blocking errors from non-blocking warnings, and MUST
  refuse to save when blocking errors remain.
- **FR-018**: The system MUST present a configuration preview that reflects the
  current form state during creation and editing.

#### Capability Registry — MCP Servers

- **FR-019**: The system MUST allow an authenticated user to register a remote MCP
  server with a label, address, allowed tools, connection origin, required flag,
  and a credential reference.
- **FR-020**: The system MUST enforce that MCP server labels are unique within a
  workspace and MUST identify the conflict when they are not.
- **FR-021**: The system MUST show each MCP server's connection origin so the user
  can tell where its traffic originates.
- **FR-022**: The system MUST report MCP reachability and validation status with
  actionable failure reasons, and MUST retain a record that fails validation in an
  unhealthy state rather than discarding it.
- **FR-022a**: MCP reachability MUST be measured from the workspace's real
  execution environment, so that a server reachable only through the workspace's
  private network is reported as reachable and a server reachable only from the
  platform service is not falsely reported as reachable.
- **FR-022b**: The system MUST show whether the execution environment is
  currently able to perform reachability checks, and MUST report a capability's
  reachability as unverified — rather than healthy or unhealthy — when the
  environment cannot be consulted.
- **FR-022c**: The execution environment MUST perform only the reachability and
  environment-health checks the platform asks of it, and MUST NOT accept
  arbitrary commands from the platform.
- **FR-023**: The system MUST allow a user to view, list, and edit registered MCP
  servers, showing each server's status in the entity column.

#### Durability, Audit, and Secrets

- **FR-024**: All skills, MCP servers, credential references, and audit entries
  created in this feature MUST remain intact and unchanged after the platform
  restarts.
- **FR-025**: The system MUST record every capability registration, edit, and
  removal as an audit entry identifying the actor, action, affected capability,
  time, and outcome.
- **FR-026**: Audit entries MUST be append-only: once recorded, an entry MUST NOT
  be modifiable or removable, and corrections MUST be expressed as additional
  entries.
- **FR-027**: A user MUST be able to see who registered or last changed a
  capability and when, from that capability's own view.
- **FR-028**: Credential values MUST NOT appear in any browser-visible data,
  validation message, configuration preview, or audit entry; only an opaque
  reference and a health state may be shown.
- **FR-029**: Credential values MUST NOT be readable in plain text where they are
  stored.
- **FR-030**: Text resembling a credential or secret in an external error or
  validation payload MUST be redacted before being shown or recorded.
- **FR-031**: The system MUST prevent removal of a capability that is referenced
  by any agent, and MUST identify the referencing agents.
- **FR-032**: All capability and audit data MUST be scoped to the acting user's
  workspace, and a request MUST NOT read or change another workspace's data.
- **FR-033**: Concurrent edits to the same capability MUST NOT silently discard
  another user's saved change; the losing save MUST be reported.

### Key Entities

- **Workspace User**: An identity authorized to act within one workspace, used to
  attribute every state-changing action.
- **Authenticated Session**: The platform-established proof of a user's identity
  for a period of activity, from which the acting workspace and user are derived.
- **Skill**: A reusable capability registered once and attached to agents by
  reference, identified by descriptive metadata, source reference, version,
  environment compatibility, and validation status.
- **MCP Server**: A reusable remote tool connection registered once and attached
  to agents by reference, including its label, address, allowed tools, connection
  origin, required flag, reachability status, and an opaque credential reference.
- **Credential Reference**: An opaque, named pointer to a stored secret,
  presented to users only as a reference and a health state.
- **Execution Environment**: The workspace's single self-hosted execution
  location, known to the platform by its registration and its last check-in, and
  used in this feature only to answer reachability and health questions.
- **Environment Check**: One platform-issued request for the execution
  environment to test a specific capability's reachability or report its own
  health, together with its result and the time it was answered.
- **Audit Entry**: An append-only, attributable, timestamped record of a
  state-changing action and its outcome.
- **Product Area**: A top-level navigable region of the workspace shell, owning
  its own entity collection and workspace views.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A platform engineer who has never used the product can sign in and
  register their first skill and first MCP server in 5 minutes or less.
- **SC-002**: 100% of capabilities, credential references, and audit entries
  created during acceptance testing remain intact and correctly attributed after a
  platform restart.
- **SC-003**: Secret scanning of every browser-visible response, validation
  message, configuration preview, and audit entry finds zero credential values,
  and zero credential values are readable in plain text at rest.
- **SC-004**: 100% of state-changing actions performed during acceptance testing
  are attributable to a named authenticated user, and zero are attributable to a
  browser-supplied claim.
- **SC-005**: 100% of attempts to reach workspace screens or workspace data
  without a valid authenticated session are refused, including direct links and
  expired sessions.
- **SC-006**: 100% of attempts to modify or remove a recorded audit entry are
  refused.
- **SC-007**: Every product area available in this slice is reachable within two
  interactions from any other area, and every area, entity, and creation view is
  restorable from its shared link.
- **SC-008**: Validation feedback for a capability being edited appears within 1
  second, and reachability or validation results for a submitted capability appear
  within 10 seconds or report a timeout.
- **SC-009**: A design reviewer confirms zero uses of status colors outside the
  defined status families and zero modal-first entity creation flows.
- **SC-010**: The complete User Story 1 through 3 path is verified by automated
  testing that runs the real interface against the real service and real durable
  storage, with no intercepted requests and no substituted storage.
- **SC-011**: A reviewer can determine who registered or last changed any
  capability, and when, for 100% of capabilities created during acceptance
  testing.
- **SC-012**: In acceptance testing, a server reachable only from the workspace's
  private network is reported reachable, a server reachable only from the platform
  service is not reported reachable, and a capability registered while the
  execution environment is unavailable is reported unverified rather than healthy
  or unhealthy — in 100% of cases.

## Assumptions

- The workspace concept from spec 001 continues: one workspace per deployment for
  now, with a single authorized user sufficient to complete this feature. Role
  differentiation, invitations, and access control remain out of scope.
- Authentication in this slice covers one pre-provisioned operator account whose
  credentials are established at deployment time. Multi-user accounts,
  self-service registration, single sign-on, provisioning, and password
  self-service are deferred. The purpose here is to make identity a fact the
  platform establishes rather than a claim the browser sends.
- Skills are registered **by reference** in this slice. Uploading or packaging
  skill bundles is deferred, consistent with `docs/modules/capability-registry.md`.
- MCP servers in this slice are remote and reached over HTTP. Other transports are
  deferred.
- The credential itself is supplied through the platform's secure secret mechanism
  and is represented to users only by a reference and a health state. Credential
  rotation is deferred.
- The agent, session, artifact, and trace domain behavior delivered by spec 001 is
  reused rather than redesigned. Making the Agent Registry real is slice 003, and
  real session execution is slice 004; this feature does not deliver either.
- The execution environment participates in this slice only to answer reachability
  and health checks. Starting agent executors, running sessions, ingesting
  execution events, and validating artifact files remain slice 004. This slice
  therefore delivers the environment's registration, check-in, and check-answering
  behavior, and nothing that executes agent work.
- The workspace's execution environment is already installed and configured with
  the network route to any MCP server used in acceptance testing. This feature
  verifies and reports that route's state; it does not define how the environment
  is provisioned.
- The assistant panel is delivered in this slice as a persistent, correctly
  behaving region only. Platform Chat's conversational behavior is slice 007.
- Product areas without a working screen in this slice are navigational
  placeholders at most; this feature does not deliver Workflows, Approvals,
  Artifacts, Traces, or Settings behavior.
- Web search profiles, plugin bundles, function tools, and capability usage
  analytics from the module plan are deferred.
- The reachability of any specific external MCP server depends on network
  conditions outside the platform's control; this feature specifies how the
  outcome is reported, not that any particular server is reachable.
