# Module Plan: Observability and Governance

## Purpose

This module makes agent activity inspectable, auditable, and controllable.

## User Jobs

- Inspect sessions and traces.
- Review events and tool calls.
- Handle approvals.
- Understand failures.
- See artifacts.
- Audit who started or approved actions.
- Track audit history, run snapshots, and artifact handoffs.

## Core Entities

- Session event
- Normalized event
- Tool call
- MCP call
- Subagent
- Approval request
- Approval decision
- Artifact
- Error
- Audit log entry
- Effective execution snapshot

## Approval Types

R0:

- high-risk tool call
- workflow step gate
- session cancellation
- environment with elevated network access
- state-changing platform chat command

Later:

- deployment action
- rollback action
- infrastructure change
- production data access

## R0 API Surface

- `GET /approvals`
- `POST /approvals/:id/approve`
- `POST /approvals/:id/reject`
- `GET /audit-log`
- `GET /sessions/:id/trace`
- `GET /artifacts`
- `GET /execution-snapshots/:id`
- `GET /errors`

## Business Rules

- Every approval decision records actor, timestamp, reason, and resulting action.
- Risky actions default to requiring approval.
- Failed sessions are visible on dashboard.
- Raw event payloads are retained for debugging.
- Effective redacted run snapshots are retained for explaining past behavior.
- Markdown artifact file references are tracked with producer and consumer relationships.
- Secrets are redacted before logging.

## Risks

- Storing too much event data without retention controls.
- Not enough context for failures.
- Approvals become noisy and users rubber-stamp them.

## R0 Constraints

- Keep approval categories small.
- Capture enough event context for debugging.
- Add retention settings before enterprise use.
- Defer dedicated usage and cost dashboards until core observability is working.
- Do not invent success; mark outcomes based on actual event/session state.
