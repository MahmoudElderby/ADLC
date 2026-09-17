# OpenAI Integration Plan

## Official Documentation Links

Use these OpenAI docs as the source of truth:

- Agents API overview: https://developers.openai.com/api/docs/guides/agents-api/overview
- Agents API architecture: https://developers.openai.com/api/docs/guides/agents-api/architecture
- Configuring agents: https://developers.openai.com/api/docs/guides/agents-api/configuring-agents
- Run and continue sessions: https://developers.openai.com/api/docs/guides/agents-api/sessions
- Session events and items: https://developers.openai.com/api/docs/guides/agents-api/sessions/events-and-items
- Manage sessions: https://developers.openai.com/api/docs/guides/agents-api/sessions/manage
- Self-hosted sandboxes: https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted
- MCP connections: https://developers.openai.com/api/docs/guides/agents-api/tools/mcp
- Plugins: https://developers.openai.com/api/docs/guides/agents-api/tools/plugins
- Vaults: https://developers.openai.com/api/docs/guides/agents-api/tools/vaults
- Multi-agent: https://developers.openai.com/api/docs/guides/agents-api/multi-agent
- Tracing: https://developers.openai.com/api/docs/guides/agents-api/tracing
- API reference: create agent: https://developers.openai.com/api/reference/resources/beta/subresources/agents/methods/create
- API reference: create agent session: https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/create

## Integration Principles

1. Treat OpenAI as the execution substrate, not as the product database.
2. Store local copies of configuration for versioning and UI diffing.
3. Persist OpenAI IDs after creation.
4. Normalize events for dashboards, but keep raw payloads for debugging.
5. Keep secrets out of frontend code and logs.
6. Make each external API call idempotent at the app layer where possible.

## Authentication

R0 should support workspace-level OpenAI credentials:

- `OPENAI_API_KEY`
- OpenAI project ID

For local development, read from environment variables.

For hosted workspaces, store encrypted credentials:

- Encrypt at rest.
- Decrypt only inside backend service.
- Never return full secret values to the browser.
- Redact secrets from logs.

## OpenAI Project

The current requested OpenAI project is:

```text
proj_mvLEI86HWGOQOYHCiSkl3CNb
```

Store this as `openai_project_id` in workspace settings. Allow future workspace-level override.

## Agent Creation

Local flow:

1. User creates or edits an agent draft.
2. App validates required fields.
3. User publishes the agent.
4. Backend calls `POST /v1/agents`.
5. Backend stores returned OpenAI `agent_id`.
6. Further edits create local versions and can update/recreate the saved OpenAI agent depending on API support and product policy.

Core saved fields:

- name
- model
- instructions
- reasoning
- text
- tools
- metadata
- multi_agent

R0 should support:

- Manual JSON advanced editor
- Structured editor
- Diff between local versions
- OpenAI payload preview before publish

## Session Creation

Local flow:

1. User chooses an agent.
2. Backend resolves the workspace self-hosted environment.
3. User enters initial input.
4. Backend resolves agent, workspace environment, tools, vaults, skills, and approvals.
5. Backend calls `POST /v1/agents/sessions` with `stream: true`.
6. Backend forwards normalized stream events to browser using server-sent events.
7. Backend persists raw and normalized events.
8. Backend tracks Markdown artifact metadata and file references produced in the shared workspace.

Session request should usually use:

```json
{
  "agent_id": "agent_...",
  "environment": {
    "type": "self_hosted"
  },
  "input": "User task...",
  "stream": true
}
```

R0 does not expose OpenAI-hosted or multiple named environment choices. All workflow sessions use the workspace self-hosted environment. Non-workflow system-agent interactions may use the smallest safe environment supported by the OpenAI contract, but they remain internal implementation details.

## Workspace Self-Hosted Environment

R0 supports one workspace-wide self-hosted environment.

Use for:

- shared workspace filesystem access
- Markdown artifact production and handoff
- customer-controlled tools and runtime access
- skills/plugins copied into session context
- MCP servers reachable from the workspace environment

Workspace settings:

- workspace path
- environment connection status
- runtime/tooling health
- MCP reachability checks where applicable
- secret reference health, without exposing secret values

Do not expose multiple environment profiles, OpenAI-hosted sandbox selection, or per-step environment selection in R0.

## Skills

Skills are session/environment capabilities.

Product model:

- Store skill metadata locally.
- Support skill references when already uploaded/available.
- Later support uploading inline ZIP skill bundles.
- Allow agent definitions to attach skills by reference.
- At session start, copy or inject the resolved latest active skill version into the session context.
- Snapshot the resolved skill version/config into run history.

UI should show:

- skill name
- description
- version
- source
- compatible environment types
- attached agents/workflows

## MCP Servers

MCP servers belong in agent tool configuration.

Product model:

- Register MCP server once.
- Store transport type, label, allowed tools, credentials, and connection origin.
- Attach MCP by reference to agents or workflow steps.
- Resolve into OpenAI `tools` payload at publish/session time.

Connection origins:

- `service` for remote HTTP MCP servers reachable by OpenAI service.
- `environment` for servers reachable from the selected sandbox.

R0 should support remote HTTP MCP first.

Stdio MCP can come later if the self-hosted environment model needs it. R0 should support remote HTTP MCP first unless a local MCP is required for the first walking skeleton.

## Multi-Agent Orchestration

OpenAI supports built-in multi-agent delegation through `multi_agent`.

Product behavior:

- Expose a toggle: "Enable subagent delegation".
- Expose `max_concurrent_subagents`.
- Show subagent events in the live canvas.
- Make clear that subagents inherit configured MCP tools, credentials, allowed tools, web search settings, and environment files/tools.

Use built-in OpenAI multi-agent features for in-session delegation.

Use the platform workflow engine for cross-session and cross-agent orchestration.

## System Agents

R0 uses separate ADLC-managed system agents through OpenAI Agents API:

1. Platform Chat Agent
2. Workflow Orchestrator Agent

System agents are created from internal platform configuration, not from normal user Agent Registry records. Platform Chat is user-facing and conversational. Workflow Orchestrator is workflow-facing and returns structured transition decisions. Both use scoped platform tools and audit every state-changing action.

## Event Streaming

R0 streaming plan:

1. Backend calls OpenAI session creation with `stream: true`.
2. Backend parses OpenAI SSE stream.
3. Backend stores raw events.
4. Backend emits normalized events to browser over app SSE.
5. Browser updates:
   - chat output
   - activity stream
   - live fleet canvas
   - session state
   - approval queue

Why proxy streaming through backend:

- Keeps OpenAI API key secret.
- Allows persistence.
- Allows event normalization.
- Allows dashboard fan-out.
- Allows policy enforcement.

## Required Actions and Approvals

OpenAI sessions may enter states that require action, such as function tool calls or environment connection actions.

App behavior:

- Detect `requires_action`.
- Persist required action.
- Show it in the approval/attention queue.
- If it is a platform-managed function tool, run it only if policy allows.
- If user approval is required, pause until approved or rejected.
- Submit result back to the relevant OpenAI session/event endpoint.

## Error Handling

Handle:

- API authentication failures
- project/model access errors
- rate limits
- invalid agent payload
- invalid environment payload
- session failed
- stream interruption
- MCP connection failures
- environment provisioning failures
- missing required action handler

Persist errors with:

- workspace
- agent
- session
- request ID if available
- OpenAI error code/message
- retry eligibility
- user-facing summary

## Data Retention

Store:

- local agent configs
- OpenAI agent IDs
- local session records
- OpenAI session IDs
- raw event payloads
- normalized event projections
- Markdown artifact metadata and filesystem references
- approval decisions
- API request metadata
- effective redacted execution snapshots for agents, workflows, skills, MCPs, and runtime options

Do not store:

- unredacted secrets
- full credential values
- unnecessary customer source files unless explicitly uploaded

## Local Development API Calls

The first local proof should use curl to exercise:

- create agent
- create streamed session
- stream events
- handle errors
- detect required actions

After the HTTP contract is verified, wrap the same calls in the backend OpenAI integration module.
