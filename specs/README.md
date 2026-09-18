# ADLC Spec Registry

This registry tracks all Spec Kit feature specs for ADLC.

| # | Spec | Status | Owner / Lead | Feature Directory | Current Artifact | Next Action | Notes |
|---|---|---|---|---|---|---|---|
| 001 | R0 agent fleet control plane walking skeleton | Implementing | Mahmoud / ADLC product decisions | `specs/001-r0-agent-fleet-skeleton` | `tasks.md` Phase 7 convergence | Move T089-T105 into specs 003 and 004 | Backend domain logic and tests done; 17 convergence tasks open. Not demoable: no persistence, no real OpenAI call, no app shell. See `docs/09-product-gap-assessment.md` |
| SPIKE-001 | Real execution path proof | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Start now, in parallel with 002 | Enabling spike, timeboxed, no UI. Confirms or corrects `docs/04-openai-integration.md` and the connector protocol. Gate: a failed contract becomes an ADR plus constitution review |
| 002 | Cockpit shell and the Capability Registry, for real | Done | Mahmoud / ADLC product decisions | `specs/002-cockpit-shell-capabilities` | `verification.md` accepted 2026-09-18; visual contract amended 2026-09-19 | Next: `$speckit-specify` for 003; start SPIKE-001 | Cookie identity, durable skills/MCP, Streamable HTTP handshake, Playwright `cockpit-002`. SC-012 B accepted as integration-only. Constitution v1.2.0 Principle VII binds `DESIGN_SYSTEM.md` / `DesignSystem.tsx` — tokens alone are not compliance. |
| 003 | The Agent Registry, for real | Proposed | Mahmoud / ADLC product decisions | not created | `docs/09-product-gap-assessment.md` | Run `$speckit-specify`; SPIKE-001 should run in parallel | Draft to publish, immutable versions, real OpenAI publication. Absorbs T092 |
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
