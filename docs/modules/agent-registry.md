# Module Plan: Agent Registry

## Purpose

The Agent Registry manages reusable agent definitions and their lifecycle.

## User Jobs

- Create an agent.
- Edit instructions and model settings.
- Attach tools/capabilities.
- Enable multi-agent delegation.
- Publish to OpenAI and store returned agent ID.
- Stage draft changes before publishing.
- Preserve effective run snapshots for historical sessions and workflows.

## Core Concepts

- Agent draft
- Published agent configuration
- Published agent
- OpenAI agent ID
- Tool attachment
- Capability attachment
- Approval policy reference

## Key Fields

- name
- description
- model
- instructions
- reasoning effort
- reasoning summary
- text format
- text verbosity
- tools
- multi_agent
- metadata
- OpenAI agent ID
- published status

## R0 Workflows

### Create Draft

User creates agent locally. No OpenAI API call yet.

### Publish Agent

Backend validates payload and calls OpenAI `POST /v1/agents`.

### Start Session

Agent Registry resolves current published `agent_id` for Session Runner.

## R0 API Surface

- `POST /agents`
- `GET /agents`
- `GET /agents/:id`
- `PATCH /agents/:id`
- `POST /agents/:id/publish`
- `GET /agents/:id/versions`
- `POST /agents/:id/clone`

## Business Rules

- A session can only use a published agent or an explicit draft-run mode.
- Workflow steps can only use published agents.
- Draft agents can be tested only outside workflow execution.
- Capabilities are attached by reference, not duplicated inline.
- Published agent definitions may be updated in place in R0.
- Every session/workflow run stores the effective agent configuration snapshot used at execution time.

## OpenAI Mapping

Agent Registry maps local config to OpenAI agent fields:

- `name`
- `model`
- `instructions`
- `reasoning`
- `text`
- `tools`
- `multi_agent`
- `metadata`

## Risks

- Local versions drift from OpenAI saved agent state.
- UI hides advanced options needed by power users.
- Users attach incompatible capability/environment combinations.

## R0 Constraints

- Provide JSON preview before publish.
- Store raw OpenAI response.
- Store effective run snapshots so past behavior remains explainable after published agents change.
- Keep advanced JSON override behind a clear warning.
