# Feature Specification: R0 Agent Fleet Control Plane Walking Skeleton

**Feature Branch**: `Not created (no branch hook configured)`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Specify the smallest end-to-end product slice: register a skill and MCP server, create and publish an agent, start a session in the self-hosted workspace, track a Markdown artifact, show status in Command Center, and inspect trace and audit history."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prepare a Runnable Agent (Priority: P1)

As a platform engineer, I register one skill and one MCP server, create an agent that uses both capabilities, review its configuration, and publish it so that it is available for controlled execution.

**Why this priority**: A published agent with explicit capabilities is the minimum trusted unit that the rest of the control-plane flow can execute and observe.

**Independent Test**: Starting with a healthy workspace and no registered capabilities, a tester can register a skill and MCP server, attach them to a draft agent, publish the agent, and confirm that the published agent retains the selected capabilities and approval mode.

**Acceptance Scenarios**:

1. **Given** a healthy self-hosted workspace, **when** the user registers a valid skill and a reachable MCP server, **then** both appear in the Capability Registry with their validation status and no credential values displayed.
2. **Given** validated capabilities, **when** the user creates a draft agent and attaches the skill and MCP server, **then** the agent summary shows its instructions, attached capabilities, and risky-action approval mode.
3. **Given** a complete and valid draft agent, **when** the user publishes it, **then** the agent becomes available for session creation and the publication is recorded in audit history.
4. **Given** an incomplete agent or an invalid required capability, **when** the user attempts to publish it, **then** publication is blocked and the user sees actionable validation errors.

---

### User Story 2 - Run the Agent and Track Its Artifact (Priority: P2)

As an operator, I start a session with the published agent in the shared self-hosted workspace and receive a tracked Markdown artifact so that the agent's useful output has durable provenance.

**Why this priority**: Execution and artifact production prove that configured agents and capabilities can perform real work in the intended workspace.

**Independent Test**: Using a pre-published agent and healthy workspace, a tester can start a session with an instruction that produces a Markdown file, observe the run reach a terminal state, and open the resulting artifact record with its file reference and provenance.

**Acceptance Scenarios**:

1. **Given** a published agent and healthy workspace, **when** the user supplies an initial task and starts a session, **then** the session runs in the single workspace-wide self-hosted environment using the agent's published capabilities.
2. **Given** a running session, **when** execution events occur, **then** the user can see current status and meaningful progress without exposing secret values.
3. **Given** the agent creates a Markdown file in the shared workspace, **when** the platform receives the artifact output, **then** it records the artifact name, type, file reference, producing agent, producing session, timestamps, and status.
4. **Given** a draft agent, unhealthy workspace, or unavailable required capability, **when** the user attempts to start a session, **then** the session is not started and the blocking condition is clearly identified.

---

### User Story 3 - Monitor and Investigate the Run (Priority: P3)

As an operator, I see the active session in Command Center and inspect its trace and audit history so that I can determine what happened, which configuration was used, and where the output was produced.

**Why this priority**: The product is a control plane rather than a launch form; operational visibility and accountability complete the smallest credible product loop.

**Independent Test**: With a prepared session record containing representative events and an artifact, a tester can locate an active run from Command Center, open its session details, and reconstruct the run from trace, artifact, redacted configuration snapshot, and audit entries.

**Acceptance Scenarios**:

1. **Given** a session is running, **when** the user opens Command Center, **then** the live fleet view shows the active agent, current session state, attached capability indicators, and failure or blocked status when applicable.
2. **Given** a session reaches a terminal state, **when** Command Center refreshes, **then** the session is removed from the active fleet canvas and remains accessible from session history or a relevant status summary.
3. **Given** a session has emitted execution events, **when** the user opens its trace, **then** the user can inspect ordered events, tool activity, errors, timestamps, and artifact references.
4. **Given** a completed or failed session, **when** the user opens its audit history, **then** the user can identify who initiated the run, the published agent used, the effective redacted configuration, state transitions, and the final outcome.

### Edge Cases

- A skill is registered successfully but is incompatible with the single self-hosted workspace.
- An MCP server is saved but cannot be reached, or its referenced credential is missing or unhealthy.
- A capability becomes unavailable after the agent is published but before the session starts.
- The workspace health check passes during setup but fails immediately before or during execution.
- The user attempts to run a draft agent or an agent whose publication is no longer valid.
- The session is interrupted after some events have been recorded but before a terminal event arrives.
- The agent reports a Markdown artifact whose file is missing, outside the approved workspace, unreadable, or not a Markdown file.
- The same artifact reference is reported more than once during a session.
- A trace or external error payload contains text resembling a credential or secret.
- Live status delivery is interrupted while the underlying session continues.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose the health and connection status of the single workspace-wide self-hosted environment before the user starts a session.
- **FR-002**: The system MUST allow a user to register a skill with enough descriptive, source, version, and compatibility information to identify and validate it.
- **FR-003**: The system MUST allow a user to register a remote MCP server with its connection details, allowed tools, required status, and credential reference without displaying or retaining a browser-readable credential value.
- **FR-004**: The system MUST show the validation status and actionable validation failures for each registered skill and MCP server.
- **FR-005**: The system MUST allow a user to create a draft agent with a name, purpose, instructions, attached skill, attached MCP server, and risky-action approval mode.
- **FR-006**: The system MUST provide a reviewable agent summary that distinguishes errors that block publication from warnings that do not.
- **FR-007**: The system MUST prevent publication when required agent information is missing or a required attached capability is invalid.
- **FR-008**: The system MUST allow a valid draft agent to be published and MUST make only published agents available for session creation.
- **FR-009**: The system MUST record agent creation, capability attachment changes, and publication as attributable audit events.
- **FR-010**: The system MUST allow a user to start a session by selecting a published agent and providing an initial task.
- **FR-011**: Every session in this feature MUST run in the single workspace-wide self-hosted environment; users MUST NOT select an alternative environment.
- **FR-012**: Before starting a session, the system MUST verify that the workspace and required agent capabilities are available and MUST explain any condition that blocks execution.
- **FR-013**: The system MUST preserve the effective redacted agent, capability, workspace, approval, and runtime configuration used by each session so later agent changes do not alter its historical record.
- **FR-014**: The system MUST expose the session's current state and meaningful execution progress from start through a terminal outcome.
- **FR-015**: While a session is active, Command Center MUST show its main agent, current status, capability indicators, and any blocked or failed state.
- **FR-016**: After a session reaches a terminal state, Command Center MUST remove it from the active fleet canvas while preserving navigation to its historical record through the appropriate session or status view.
- **FR-017**: When a session produces a valid Markdown file in the shared workspace, the system MUST create or update one artifact record for that file reference.
- **FR-018**: Each artifact record MUST identify the artifact name, Markdown type, workspace file reference, status, producing agent, producing session, and relevant timestamps.
- **FR-019**: The system MUST flag an artifact reference as invalid without losing the session record when the referenced file is missing, unreadable, outside the approved workspace, or not Markdown.
- **FR-020**: The system MUST provide a session trace containing ordered execution events, tool activity, errors, timestamps, state transitions, and artifact references when those events exist.
- **FR-021**: The system MUST provide an audit history that identifies the actor, action, affected entity, time, and outcome for state-changing actions in this feature.
- **FR-022**: A user MUST be able to navigate from an active Command Center item to the session detail and from the session detail to its agent, trace, artifact, and audit evidence.
- **FR-023**: The system MUST preserve partial trace and audit evidence when a session fails, is interrupted, or loses live status delivery.
- **FR-024**: Secret values MUST NOT appear in browser responses, validation messages, live status, trace details, artifact metadata, configuration snapshots, or audit history.
- **FR-025**: Retrying display or status delivery MUST NOT create duplicate session, event, audit, or artifact records.

### Key Entities

- **Workspace**: The product boundary containing its OpenAI project reference, users, agents, capabilities, sessions, artifacts, and audit history.
- **Workspace Environment**: The single self-hosted execution location shared by all R0 agents, including workspace path, connection state, tooling health, filesystem health, and redacted secret-reference health.
- **Skill**: A reusable capability registered once and attached to agents by reference, identified by descriptive metadata, source, version, compatibility, and validation status.
- **MCP Server**: A reusable remote tool connection registered once and attached to agents by reference, including allowed tools, reachability status, and an opaque credential reference.
- **Agent**: A draft or published role definition containing its purpose, instructions, capability references, and risky-action approval mode.
- **Session**: One execution of a published agent for an initial task, with lifecycle state, effective redacted configuration snapshot, trace, artifact references, and outcome.
- **Session Event**: A timestamped fact in the ordered execution history, including progress, tool activity, state changes, errors, and artifact production.
- **Artifact**: Metadata and provenance for a Markdown file produced in the shared workspace, referenced by path rather than duplicated into the platform record.
- **Audit Entry**: An attributable, timestamped record of a state-changing action and its outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of representative platform engineers can complete the full golden path in 10 minutes or less once workspace credentials and the self-hosted environment are available.
- **SC-002**: In every successful acceptance run, the published agent uses the selected skill and MCP server and the resulting session record identifies both capabilities.
- **SC-003**: At least 95% of session status changes become visible to the user within 2 seconds under normal operating conditions.
- **SC-004**: Every valid Markdown artifact reported by a successful acceptance run appears with complete provenance within 5 seconds of being reported.
- **SC-005**: For 100% of tested successful, failed, and interrupted sessions, a reviewer can determine the initiating actor, agent configuration, significant execution events, artifact outcome, and final session state from retained records.
- **SC-006**: Secret-scanning validation finds zero unredacted secret values across browser-visible data, traces, artifact metadata, configuration snapshots, and audit history.
- **SC-007**: At least 90% of representative operators can locate an active session from Command Center and reach its trace and audit evidence in 2 minutes or less without assistance.
- **SC-008**: Repeated delivery of the same status event or artifact reference creates zero duplicate user-visible records in acceptance testing.

## Assumptions

- Workspace authentication and an authorized platform engineer or operator identity already exist; identity administration is outside this feature.
- The workspace's OpenAI project reference, API credential, and self-hosted environment connection are configured before the golden path begins. This feature verifies their health but does not define the credential-onboarding flow.
- The walking skeleton registers one skill and one remote HTTP MCP server; broader capability lifecycle management and additional connection types are deferred.
- The MCP credential is supplied through an existing secure secret mechanism and is represented to users only by a reference and health state.
- The session task used to validate the walking skeleton is expected to produce at least one `.md` file inside the approved shared workspace path.
- The live Command Center canvas contains active operational work only. Completed sessions, historical traces, artifacts, and audit records remain available in their dedicated views.
- Failure handling in this slice preserves evidence and explains recovery conditions; automated retries and advanced recovery actions are deferred.
- Workflow composition, Platform Chat, multi-agent delegation, general approval-queue handling, multiple environments, OpenAI-hosted environments, advanced analytics, and complete registry administration are outside this feature.

