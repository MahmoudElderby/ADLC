# Data Model and API Boundaries

## Purpose

This document defines the first-pass data model and API boundary rules for the modular monolith. It is not a final database schema. It is the shared map implementers should use before writing migrations.

## Boundary Rules

1. Each module owns its tables and write operations.
2. Other modules read through service interfaces or query projections.
3. Cross-module writes happen through explicit application services.
4. OpenAI raw payloads are preserved, but UI reads normalized projections.
5. Secrets are never stored in normal module tables.
6. Audit records are append-only.

## Core Tables by Module

### Workspace and Governance

`workspaces`

- id
- name
- openai_project_id
- created_at
- updated_at

`workspace_secrets`

- id
- workspace_id
- type
- encrypted_value
- key_version
- created_at
- rotated_at

`audit_log`

- id
- workspace_id
- actor_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

### Agent Registry

`agents`

- id
- workspace_id
- name
- description
- status
- current_version_id
- openai_agent_id
- created_by
- created_at
- updated_at

`agent_versions`

- id
- agent_id
- version_number
- config_json
- openai_payload_json
- openai_response_json
- published_at
- created_by
- created_at

`agent_capability_attachments`

- id
- agent_id
- capability_type
- capability_id
- config_override_json
- created_at

### Capability Registry

`mcp_servers`

- id
- workspace_id
- label
- transport_type
- server_url
- connection_origin
- allowed_tools_json
- credential_secret_id
- required
- status
- created_at
- updated_at

`skills`

- id
- workspace_id
- name
- description
- source_type
- openai_skill_id
- version
- compatible_environment_types_json
- status
- created_at
- updated_at

`web_search_profiles`

- id
- workspace_id
- name
- mode
- allowed_domains_json
- context_size
- created_at
- updated_at

### Workspace Environment Settings

`workspace_environment_settings`

- id
- workspace_id
- type
- config_json
- status
- created_at
- updated_at

### Workflow Orchestrator

`workflows`

- id
- workspace_id
- name
- description
- status
- current_version_id
- created_at
- updated_at

`workflow_versions`

- id
- workflow_id
- version_number
- graph_json
- created_by
- created_at

`workflow_runs`

- id
- workflow_id
- workflow_version_id
- status
- started_by
- started_at
- completed_at
- failed_at
- failure_summary
- effective_workflow_snapshot_json

`workflow_step_runs`

- id
- workflow_run_id
- step_id
- agent_id
- session_id
- status
- input_json
- output_json
- effective_step_snapshot_json
- started_at
- completed_at
- failed_at

### Session Runner

`agent_sessions`

- id
- workspace_id
- agent_id
- openai_session_id
- status
- initial_input
- effective_config_snapshot_json
- created_by
- started_at
- last_event_at
- completed_at
- failed_at
- failure_summary

`session_events_raw`

- id
- session_id
- sequence_number
- openai_event_type
- payload_json
- received_at

`session_events_normalized`

- id
- session_id
- sequence_number
- category
- event_type
- actor_type
- actor_id
- summary
- metadata_json
- created_at

### Observability and Governance

`approval_requests`

- id
- workspace_id
- session_id
- workflow_run_id
- type
- status
- risk_level
- title
- description
- requested_action_json
- requested_at
- resolved_by
- resolved_at
- resolution_reason

`artifacts`

- id
- workspace_id
- session_id
- workflow_run_id
- name
- artifact_type
- openai_artifact_id
- file_path
- file_ref
- status
- producer_step_run_id
- consumed_by_step_run_ids_json
- metadata_json
- created_at

`errors`

- id
- workspace_id
- session_id
- workflow_run_id
- source
- error_code
- message
- request_id
- retryable
- metadata_json
- created_at

### Platform Chat

`platform_chat_threads`

- id
- workspace_id
- title
- created_by
- created_at
- updated_at

`platform_chat_messages`

- id
- thread_id
- role
- content
- cited_entities_json
- action_requests_json
- created_at

## API Boundary Style

Use resource-oriented JSON APIs for R0.

Examples:

- `/agents`
- `/capabilities/mcp`
- `/capabilities/skills`
- `/workspace-environment`
- `/workflows`
- `/workflow-runs`
- `/sessions`
- `/approvals`
- `/platform-chat`
- `/dashboard`

The frontend should not call OpenAI directly. All OpenAI API calls go through the backend.

## Streaming Boundary

Use app-owned server-sent events:

```text
Browser -> GET /sessions/:id/stream
Backend -> OpenAI stream or local event replay
Backend -> browser SSE events
```

This supports reconnects, stored event replay, credential protection, and event normalization.

## Command Boundary

State-changing platform chat actions should be represented as command requests:

1. Chat suggests command.
2. UI asks user to confirm.
3. Backend executes command.
4. Audit log records command result.

Do not let natural language directly mutate system state without a confirmation boundary.
