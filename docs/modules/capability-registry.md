# Module Plan: Capability Registry

## Purpose

The Capability Registry manages reusable MCP servers, skills, plugins, vault references, web search settings, and future function tools.

## User Jobs

- Register an MCP server.
- Register or reference a skill.
- Attach capabilities to agents or workflows.
- Understand which agents use which capabilities.
- Test connection/configuration where possible.

## Capability Types

R0:

- MCP server
- Skill reference
- Web search profile

Later:

- Plugin bundles
- Function tools
- Vault credentials
- Inline skill ZIP uploads

## MCP Server Fields

- label
- transport type: HTTP first, stdio later
- server URL
- allowed tools
- connection origin: service or environment
- required flag
- credential reference
- request metadata
- status

## Skill Fields

- name
- description
- skill ID or source reference
- version
- compatible environment types
- capability directories
- status

## R0 API Surface

- `POST /capabilities/mcp`
- `GET /capabilities/mcp`
- `PATCH /capabilities/mcp/:id`
- `POST /capabilities/skills`
- `GET /capabilities/skills`
- `PATCH /capabilities/skills/:id`
- `GET /capabilities/usage/:id`

## Business Rules

- MCP labels must be unique within a workspace.
- Credentials are referenced, never embedded in visible config.
- Capability deletion is blocked if active agents/workflows use it.
- Compatibility validation runs before agent publish and session start.

## OpenAI Mapping

MCP capabilities map into OpenAI agent `tools` entries.

Skills map into agent session context. At session start, ADLC copies or injects the resolved latest active skill version into the OpenAI-managed session and snapshots that resolved configuration into run history.

## Risks

- Confusing boundary between agent-level tools and environment-level capabilities.
- Secret leakage through MCP headers or metadata.
- Remote MCP availability issues.

## R0 Constraints

- Support HTTP MCP first.
- Show a clear "where this runs" indicator: OpenAI service or selected environment.
- Start with remote HTTP MCP unless the first walking skeleton requires a local MCP.
- Snapshot redacted MCP/tool configuration into every run that uses it.
