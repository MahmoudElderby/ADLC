# Module Plan: Command Center Dashboard

## Purpose

The Command Center Dashboard is the home screen. It tells users what has been configured, what is running now, and what needs attention.

## User Jobs

- See configured inventory counts.
- See active agent and workflow activity.
- Identify failures and pending approvals.
- Open a running session quickly.
- Understand the health of the agent fleet.

## Core UI Areas

1. Inventory metrics band
2. Live Agent Fleet Canvas
3. Attention panel
4. Activity stream
5. Platform chat dock

## Key Metrics

- Agents configured
- Workflows configured
- Skills registered
- MCP servers connected
- Workspace environment health
- Active sessions
- Running subagents
- Pending approvals
- Failed runs
- Artifacts created
- Tool calls today
- Workspace environment health

## Live Agent Fleet Canvas

Represent active sessions as mission clusters.

Visual model:

- Main agent: large cybernetic node
- Subagents: smaller drone nodes
- MCP calls: beams/routes to tool nodes
- Skills: attached module chips
- Approval gates: amber locks
- Failures: red pulsing states
- Completed outputs: artifact bay

This canvas should be operational, not decorative. Clicking any entity opens the related session, agent, tool call, approval, or artifact.

## Backend Inputs

- Aggregated counts from each module
- Active session states
- Recent events
- Pending approvals
- Failed session summaries
- Artifact summaries

## R0 API Surface

- `GET /dashboard/summary`
- `GET /dashboard/activity`
- `GET /dashboard/live-fleet`
- `GET /dashboard/attention`

## R0 Data Dependencies

- Agent Registry
- Capability Registry
- Workspace Environment Settings
- Workflow Orchestrator
- Session Runner
- Observability and Governance

## Risks

- Canvas becomes decorative instead of useful.
- Too much animation harms readability.
- Counts become inconsistent if modules calculate them differently.

## R0 Constraints

- Use query projections from stored normalized events.
- Do not calculate dashboard state by replaying all raw events on every page load.
- Keep animations subtle and optional.
