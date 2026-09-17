# Module Plan: Workspace Environment Settings

## Purpose

Workspace Environment Settings define the single self-hosted workspace where R0 agent sessions run.

## User Jobs

- Configure the self-hosted workspace connection.
- Confirm the shared workspace path used by agent sessions.
- See runtime/tooling health for the workspace.
- Understand that agent skills and MCPs are configured on agents, not on separate environment profiles.

## R0 Environment Model

R0 has one workspace-wide self-hosted environment.

It answers: where does work happen?

Agent definitions answer: what can this role do there?

The workspace environment is shared by all agents and workflows. Capability boundaries are enforced through agent configuration, skill/MCP attachment, and approval policy rather than per-step environment selection.

## Core Settings

- workspace path
- connection status
- available runtime/tooling status
- filesystem access health
- MCP reachability checks where applicable
- secret reference health, without exposing secret values

## R0 API Surface

- `GET /workspace-environment`
- `PATCH /workspace-environment`
- `POST /workspace-environment/validate`
- `GET /workspace-environment/health`

## Business Rules

- Each R0 workspace has exactly one self-hosted environment.
- Workflow steps do not choose environments in R0.
- Agents run in the workspace environment using their configured skills, MCPs, and approval policy.
- Environment settings never expose secret values to the browser.
- OpenAI-hosted environments and multiple named environment profiles are deferred.

## Artifact Handling

Agents produce Markdown artifacts in the shared workspace filesystem. The environment settings module does not decide artifact paths. Each agent's configured skills and instructions define artifact organization and naming. ADLC records artifact metadata and file references through Observability and Governance.

## Risks

- A single shared environment increases reliance on agent capability policy.
- Workspace path and artifact organization can become messy if agent skills are vague.
- Tooling health failures can block many agents at once.

## R0 Constraints

- Do not expose multiple environment profiles in R0.
- Do not expose OpenAI-hosted environment selection in R0.
- Keep environment configuration minimal and operational.
