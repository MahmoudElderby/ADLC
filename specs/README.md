# ADLC Spec Registry

This registry tracks all Spec Kit feature specs for ADLC.

| # | Spec | Status | Owner / Lead | Feature Directory | Current Artifact | Next Action | Notes |
|---|---|---|---|---|---|---|---|
| 001 | R0 agent fleet control plane walking skeleton | Implementing | Mahmoud / ADLC product decisions | `specs/001-r0-agent-fleet-skeleton` | `tasks.md` Phase 7 convergence | Move T089-T105 into specs 003 and 004 | Backend domain logic and tests done; 17 convergence tasks open. Not demoable: no persistence, no real OpenAI call, no app shell. See `docs/09-product-gap-assessment.md` |
| SPIKE-001 | Real execution path proof | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Start now, in parallel with 002 | Enabling spike, timeboxed, no UI. Confirms or corrects `docs/04-openai-integration.md` and the connector protocol. Gate: a failed contract becomes an ADR plus constitution review |
| 002 | Cockpit shell and the Capability Registry, for real | Ready for Plan | Mahmoud / ADLC product decisions | `specs/002-cockpit-shell-capabilities` | `spec.md`, `demo.md`, requirements checklist | Run `$speckit-plan` | Shell from `docs/07` plus one real vertical: skills and MCP on real API, PostgreSQL, real audit, operator sign-in. Absorbs T089-T091, T104, T105, capability halves of T099/T100, and environment check-in from T096. Checklist all green; 3 clarifications answered |
| 003 | The Agent Registry, for real | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Await 002 and SPIKE-001 | Draft to publish, immutable versions, real OpenAI publication. Absorbs T092 |
| 004 | Live session execution | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Await 003 | Executor dispatch, real session, event ingestion, browser SSE, live canvas, agent-level risky-action modes. Absorbs T093-T095, T097, T098, T102, T103 and the remainder of T096/T099 |
| 005 | Operational investigation surfaces | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Await 004 | History, trace, audit, Artifacts and Traces areas against real data. Absorbs T101 |
| 006 | Sequential workflows with human approval gates | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Await 005 | Workflow Orchestrator, builder canvas, artifact handoff, Approvals area. Approvals merged here per Constitution IV |
| 007 | Platform Chat, grounded and read-only | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Await 006 | Last because its value scales with accumulated platform state. State-changing chat deferred to R1 |

R0 release readiness is a `$speckit-checklist` run measuring SC-001 through
SC-008 against the assembled system, not a spec. Each success criterion is owned
by the slice that introduces it.

## Status Values

Use:

- `Proposed`
- `Spec Draft`
- `Clarifying`
- `Ready for Plan`
- `Planned`
- `Tasked`
- `Implementing`
- `Done`

## Update Rule

Update this file whenever a spec is created, clarified, planned, tasked,
implemented, or accepted.
