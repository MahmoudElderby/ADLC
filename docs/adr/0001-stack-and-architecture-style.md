# ADR 0001: Stack and Architecture Style

Date: 2026-09-17

## Status

Proposed

## Decision

Build R0 as a TypeScript modular monolith backed by PostgreSQL, with OpenAI Agents API as the managed agent execution substrate.

Recommended stack:

- React + TypeScript frontend
- Node.js + TypeScript backend
- NestJS or Fastify modular API
- PostgreSQL
- Prisma or Drizzle ORM
- Postgres-backed job queue
- Server-sent events for live streaming
- React Flow for workflow and live fleet canvases
- Tailwind CSS + Radix UI for UI foundations

## Context

The product has many product modules, but R0 does not yet need distributed runtime isolation. The main risks are product complexity, fast iteration, and correctness of OpenAI integration. Microservices would add operational weight before module boundaries are validated.

## Consequences

Positive:

- Simple local development
- One deployment unit
- One database
- Easier transaction management
- Faster iteration
- Clear internal modules without network boundaries

Negative:

- Module discipline must be enforced in code review.
- Heavy streaming load may later require a dedicated gateway.
- Very large artifacts may later need object storage beyond shared filesystem references.
- Background jobs may later need a more powerful queue.

## Rejected Alternatives

### Microservices

Rejected for R0 because the team does not yet have proven independent scaling, team ownership, or deployment needs.

### Kafka/Event Bus

Rejected for R0 because Postgres plus a job queue is enough for workflow and streaming persistence.

### Custom Agent Runtime

Rejected because OpenAI Agents API already provides managed sessions, tools, environments, streaming, and multi-agent delegation.

### Multiple Environment Profiles

Rejected for R0 because the workspace uses one self-hosted environment. Agent definitions carry the skill, MCP, persona, and approval differences that matter for the first product slice.

### OpenAI-Hosted R0 Environments

Rejected for R0 because Markdown artifact handoff and shared workspace behavior are central to the first product loop.

### No Backend

Rejected because the product must protect OpenAI credentials, persist events, enforce policy, manage approvals, and normalize streams.
