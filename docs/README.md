# AI SDLC Command Center Planning Pack

Date: 2026-09-17

This pack defines the business thesis, product scope, system architecture, frontend UI rules, module plans, and OpenAI Agents API integration plan for an AI SDLC Command Center.

## Recommended Reading Order

1. [Product thesis](./01-product-thesis.md)
2. [Business plan](./02-business-plan.md)
3. [Main architecture](./03-main-architecture.md)
4. [OpenAI integration](./04-openai-integration.md)
5. [Roadmap](./05-roadmap.md)
6. [Data model and API boundaries](./06-data-model-and-api-boundaries.md)
7. [Frontend UI guidelines](./07-frontend-ui-guidelines.md)
8. [Spec tracking](./08-spec-tracking.md)
9. [Product gap assessment and long-term spec plan](./09-product-gap-assessment.md)
10. [Stack ADR](./adr/0001-stack-and-architecture-style.md)
11. Module plans:
   - [Command Center Dashboard](./modules/command-center-dashboard.md)
   - [Agent Registry](./modules/agent-registry.md)
   - [Capability Registry](./modules/capability-registry.md)
   - [Workspace Environment Settings](./modules/workspace-environment-settings.md)
   - [Workflow Orchestrator](./modules/workflow-orchestrator.md)
   - [Session Runner](./modules/session-runner.md)
   - [Platform Chat](./modules/platform-chat.md)
   - [Observability and Governance](./modules/observability-governance.md)

## Product Summary

The product is an AI SDLC Command Center: a control plane where engineering teams create, configure, orchestrate, run, monitor, and govern specialized AI agents across the software delivery lifecycle.

It is not just an agent builder. It is an operational system for managing agent fleets, SDLC workflows, tool access, one self-hosted workspace environment, approvals, Markdown artifacts, traces, and live execution state.

## Architecture Summary

R0 should be a modular monolith:

- React + TypeScript frontend
- Node.js + TypeScript backend
- PostgreSQL as the primary database
- Postgres-backed job queue for simple async work
- Server-sent events for live session streaming
- OpenAI Agents API as the managed agent/session execution layer
- one workspace-wide self-hosted execution environment for R0

The product should avoid microservices, Kafka, Kubernetes-first deployment, multiple environment profiles, OpenAI-hosted R0 sandboxes, and separate agent execution infrastructure until real usage forces those choices.
