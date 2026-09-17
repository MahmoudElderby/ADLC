# Module Plan: Workflow Orchestrator

## Purpose

The Workflow Orchestrator composes published agents, approvals, artifact references, and input/output mappings into repeatable SDLC workflows.

## User Jobs

- Create a workflow from agents.
- Define ordered steps.
- Add approval gates.
- Run a workflow and inspect progress.
- Reuse successful SDLC processes.

## R0 Workflow Model

Use understandable sequential flows with orchestrator-mediated returns.

Step types:

- Agent session step
- Approval step
- Manual note step
- Artifact review step

Avoid a general visual branching engine in R0. Any agent may return findings, blockers, questions, or failed validation outcomes to the orchestrator. The orchestrator decides whether to continue, resume, return to an earlier step, create a pending action, or fail/cancel the workflow.

## Example Workflow

Feature request workflow:

1. Discovery Agent
2. Product Agent
3. Architect Agent
4. Implementer Agent
5. Reviewer Agent
6. QA Agent
7. Release Agent

## Workflow Run State

- pending
- running
- waiting_for_approval
- failed
- completed
- canceled

## R0 API Surface

- `POST /workflows`
- `GET /workflows`
- `GET /workflows/:id`
- `PATCH /workflows/:id`
- `POST /workflows/:id/run`
- `GET /workflow-runs/:id`
- `POST /workflow-runs/:id/cancel`

## Business Rules

- Workflow steps reference published agents.
- Approval gates can pause workflow execution.
- Step outputs can become later step inputs.
- Workflow definitions are versioned.
- Each workflow run stores the effective workflow snapshot used at execution time.
- The orchestrator passes Markdown artifact paths/references between steps by default.

## OpenAI Mapping

Each agent step usually creates one OpenAI session.

For in-session delegation, use OpenAI `multi_agent`.

For cross-agent SDLC workflows, use the platform workflow engine.

The Workflow Orchestrator Agent is an ADLC-managed system agent implemented through OpenAI Agents API. It may use AI to choose the next transition, but ambiguous, risky, or user-intent-dependent transitions become pending actions instead of silent moves.

## Risks

- Building a full automation engine too early.
- Confusing OpenAI subagents with platform workflow steps.
- Workflow canvas becomes prettier than it is useful.
- AI transition decisions become hard to audit if rationale and source context are not persisted.

## R0 Constraints

- Start with sequential workflows and limited branching.
- Make step execution visible and inspectable.
- Store every step's session ID, input, output, and artifacts.
- Store orchestrator decisions, rationale, selected transition, and audit metadata.
- Do not let agents route directly to other agents.
