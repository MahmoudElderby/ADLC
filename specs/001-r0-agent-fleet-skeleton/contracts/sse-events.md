# Normalized Session SSE Contract

## Endpoint

`GET /api/v1/sessions/{sessionId}/stream`

The endpoint uses `text/event-stream`. Authentication and workspace scope are inherited from the existing application session.

## Replay

- Every message has an integer `id` equal to the persisted local session sequence.
- A reconnecting client sends `Last-Event-ID`.
- The server replays persisted normalized events with a larger sequence, then follows live events.
- Replaying an event never creates new raw, normalized, audit, or session records.
- Heartbeat comments may be emitted every 15 seconds and are not persisted events.

## Envelope

```json
{
  "sessionId": "uuid",
  "sequence": 42,
  "occurredAt": "2026-09-18T12:00:00.000Z",
  "type": "session.state_changed",
  "data": {}
}
```

The SSE `event` field equals `type`. The SSE `id` field equals `sequence`.

## Event Types

### `session.state_changed`

```json
{
  "previous": "provisioning",
  "current": "running",
  "reason": null
}
```

Valid current states are `creating`, `provisioning`, `running`, `completed`, `failed`, `canceled`, and `interrupted`.

### `session.output.delta`

```json
{
  "text": "redacted output fragment"
}
```

### `tool.call.started`

```json
{
  "toolCallId": "source-tool-call-id",
  "toolType": "mcp",
  "serverLabel": "devops",
  "toolName": "create_work_item",
  "argumentsSummary": "redacted summary"
}
```

### `tool.call.completed`

```json
{
  "toolCallId": "source-tool-call-id",
  "outcome": "succeeded",
  "resultSummary": "redacted summary"
}
```

### `tool.call.failed`

```json
{
  "toolCallId": "source-tool-call-id",
  "errorCode": "mcp_unreachable",
  "message": "The DevOps MCP server could not be reached from the workspace."
}
```

### `artifact.reported`

```json
{
  "artifactId": "uuid",
  "reportSequence": 1,
  "name": "implementation-notes.md",
  "workspaceRelativePath": "artifacts/implementation-notes.md",
  "status": "valid"
}
```

Each distinct source report emits one event and owns one artifact record. The same path may appear in multiple events.

### `session.error`

```json
{
  "errorId": "uuid",
  "code": "executor_disconnected",
  "message": "The workspace executor disconnected before the session completed.",
  "retryable": true
}
```

## Redaction Rules

Before persistence and emission, recursively redact:

- authorization and cookie headers
- API keys, bearer tokens, executor keys, and MCP credentials
- environment remote URLs
- fields named `secret`, `token`, `password`, `credential`, or configured equivalents
- known secret values and fingerprints derived from the secret store

Redaction replaces values with `[REDACTED]`; it does not remove surrounding diagnostic structure.

## Ordering and Terminal Behavior

- Sequence numbers are strictly increasing within a session.
- The terminal `session.state_changed` event is the last state transition.
- Late upstream events may be retained as raw evidence but cannot mutate terminal state or re-add the session to the live fleet projection.

