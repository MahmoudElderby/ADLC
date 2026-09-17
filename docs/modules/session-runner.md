# Module Plan: Session Runner

## Purpose

The Session Runner starts, streams, continues, and manages OpenAI agent sessions.

## User Jobs

- Start a session from an agent.
- Send initial input.
- Watch streamed output and events.
- Continue an existing session.
- Handle errors and required actions.
- Inspect output, tool calls, subagents, and artifacts.

## Core Responsibilities

- Create OpenAI sessions.
- Proxy OpenAI streams to browser clients.
- Persist raw events.
- Normalize events for dashboards.
- Detect required actions.
- Update session state.
- Cancel sessions/turns where supported.
- Snapshot the effective resolved agent, skill, MCP, approval, and runtime configuration.
- Track Markdown artifact file references produced by the session.

## R0 API Surface

- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/events`
- `GET /sessions/:id/stream`
- `POST /sessions/:id/messages`
- `POST /sessions/:id/cancel`
- `POST /sessions/:id/actions/:actionId/resolve`

## Event Pipeline

```text
OpenAI SSE
  -> backend parser
  -> raw event store
  -> normalized event projection
  -> browser SSE
  -> dashboard/session UI/live canvas
```

## Session State

- creating
- provisioning
- running
- requires_action
- idle
- failed
- canceled
- completed

## Risks

- Stream interruption loses state.
- Browser reconnect duplicates events.
- Large sessions generate too many stored events.
- Required action handling is underspecified.

## R0 Constraints

- Assign every event a local sequence number.
- Store raw event payloads.
- Normalize only the event fields needed for UI.
- Make stream reconnection idempotent.
- Prefer backend-owned streaming so API keys stay server-side.
- Use the workspace self-hosted environment for R0 sessions.
- Do not implement a custom agent runtime in R0.
