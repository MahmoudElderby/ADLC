# Phase 0 Research: Cockpit Shell and the Capability Registry, For Real

## Codebase Baseline

**Decision**: Treat spec 001 as a domain-logic and schema foundation, not as a running product. Plan 002 against the real gaps, and treat any in-progress wiring in the working tree as incomplete until identity, probes, and the UI contract are correct.

**Rationale**: Spec 001 delivered Nest modules, Zod contracts, a Drizzle schema with migrations, and passing tests. It did not deliver an operable increment:

- Capability, audit, and environment services were designed for PostgreSQL but historically stored state in process maps. Some working-tree files now insert through Drizzle, but `WorkspaceBootstrap.ensureWorkspace` still creates a workspace from a client-supplied ID, so persistence without platform identity is still a trusted-header sham.
- `WorkspaceUserGuard` still believes `x-adlc-workspace-id` and `x-adlc-actor-id`. The web client still sends those headers from Zustand defaults rather than presenting a platform-established session.
- MCP "reachability" still runs inside the API process via `ConnectorCommandService` importing hostname-heuristic probes (`url.hostname.includes("unreachable")`). That reports a platform-service result, which FR-022a forbids.
- `apps/web` has no CSS, no tokens, and no sliced shell. `packages/ui` exports a string constant. Existing Playwright specs pass against local-state pages and cannot be 002 evidence.
- The workspace connector has protocol helpers and a heartbeat/command scaffold. Slice 002 uses registration, check-in, and typed environment checks only. `start_executor` / `stop_executor` remain slice 004.

**Alternatives considered**: Replacing the 001 schema or rewriting the capability services from scratch was rejected. The 001 data model and OpenAPI are the extension point. Ignoring partial working-tree wiring would cause duplicate work; treating it as done would ship sham identity and fake reachability.

**Absorbed 001 convergence tasks**: T089 (encrypt secrets), T090 (Drizzle append-only audit — trigger already exists in `0001_foundation.sql`), T091 (persist skills/MCP), T104 (align Drizzle types; keep `encrypted_value` as `text` holding an opaque envelope, matching shipping SQL rather than the 001 `bytea` sketch), T105 (`forceMcpStatus` already lives in test fixtures), capability halves of T099 (typed environment-side MCP probe) and T100 (wire capability UI to the API), and the registration plus check-in portion of T096. Executor command long-poll (remainder of T096/T097) is out of scope.

## 1. Application Shape and UI Stack

**Decision**: Keep the pnpm workspace from spec 001. Add Tailwind CSS and Radix UI to `packages/ui` and `apps/web`. Put design tokens, shell primitives, status badges, entity-browser rows, and the creation-workspace layout in `@adlc/ui`. Feature pages in `apps/web` own data and routes only.

**Rationale**: `docs/03-main-architecture.md` and spec 001 already chose this stack. The UI guidelines are a binding product contract. Putting tokens and shell chrome in `@adlc/ui` is how later slices add a rail item without restyling the product.

**Alternatives considered**: Copying the prototype `App.tsx` wholesale remains rejected — it is a composition example, not application source. A CSS-in-JS second system would fight Tailwind. Leaving primitives in `apps/web` would repeat spec 001's stub `@adlc/ui`. Extracting only hex tokens and shell widths was tried during the first 002 implementation and failed Principle VII: the running UI did not match `DesignSystem.tsx`. The required path is to port every `DesignSystem.tsx` primitive into `@adlc/ui` and compose Skills / MCP / sign-in from those primitives.

## 2. Product Areas and Shell

**Decision**: After sign-in, the user lands in the sliced workspace shell with two working product areas: **Skills** and **MCP Servers**. The default landing area is Skills. The navigation rail lists only those two areas. Command Center, Agents, Workflows, Sessions, Approvals, Artifacts, Traces, and Settings are omitted until a later slice delivers a working screen. The assistant panel is a persistent empty region with expanded (320px), collapsed (40px), and hidden states; the choice is stored in `localStorage` and never overlays the main workspace.

**Rationale**: FR-014 forbids dead-end rail items. FR-006 binds the shell dimensions and regions to `docs/07-frontend-ui-guidelines.md`. The guidelines list Skills and MCP Servers as separate major areas; the spec's "Capability Registry" is the entity family, not a third rail label. Landing on Command Center would be chrome around a non-working operational surface, which Principle VI forbids.

**Alternatives considered**: A single "Capabilities" rail item would contradict the UI guidelines' area list. Showing every guideline area with "not yet available" states was rejected in clarification session 2026-09-18. Making Command Center the landing page was rejected because it has no real data in this slice.

**Environment health placement**: Connector online/offline and "able to probe" are shown in the top bar and on MCP validation surfaces. A Workspace Environment rail item is not delivered unless it becomes a working screen; FR-022b does not require one.

## 3. Identity and Sessions

**Decision**: Replace trusted headers with a platform-established session for one pre-provisioned operator.

- Deployment bootstrap inserts exactly one `workspaces` row and one `workspace_users` row from environment configuration (`ADLC_OPERATOR_EMAIL`, `ADLC_OPERATOR_PASSWORD`, `ADLC_WORKSPACE_NAME`). The password is hashed with Argon2id at bootstrap if no operator exists; the plaintext is never logged or stored.
- `POST /api/v1/auth/sign-in` verifies email and password, creates `authenticated_sessions` (random 256-bit token, SHA-256 hash stored), and sets cookie `adlc_session` (HttpOnly, `SameSite=Lax`, `Path=/`, `Secure` outside local development).
- `WorkspaceUserGuard` reads the cookie, loads the hashed session, rejects missing/expired/revoked sessions with 401 `application/problem+json` that discloses no workspace names, entity lists, or field values (generic problem details only; not an empty body), and derives `workspaceId` and `actorId` from the session row. Request headers that name a workspace or actor are ignored.
- Idle timeout: 8 hours since `last_seen_at`, refreshed on authenticated use. Absolute lifetime: 24 hours from `created_at`. These are planning defaults for a single-operator R0 deployment; they can be changed by configuration without a spec change.
- `POST /api/v1/auth/sign-out` revokes the session. `GET /api/v1/auth/me` returns display identity and workspace name.
- Public routes: `GET /health`, `POST /auth/sign-in`, and connector-authenticated `/connectors/*`. Everything else requires a valid user session.
- The web app uses `credentials: "include"` and a Vite dev proxy so the cookie is same-origin. It never sends `x-adlc-workspace-id` or `x-adlc-actor-id`.

**Rationale**: FR-002 forbids browser-asserted identity. Clarification session 2026-09-18 chose one operator account as the smallest change that makes identity a platform fact. Spec 001's OpenAPI already declared `adlc_session`. A cookie plus hashed server session is the smallest durable proof; JWT in localStorage would re-create a browser-held claim.

**Alternatives considered**: Keeping trusted headers fails FR-002. SSO and self-service registration are deferred by the spec. Bearer tokens in JS-readable storage would expose the session to XSS. Per-request workspace headers cannot be the source of truth even as a fallback.

## 4. Durability, Audit, and Secrets

**Decision**: Import `DatabaseModule` into `AppModule` (if not already) and persist skills, MCP servers, credential rows, environment checks, users, and sessions in PostgreSQL. Audit uses the existing `audit_log` table and `prevent_audit_log_mutation` trigger. Application code exposes insert and select only. Capability create/edit/delete and failed unique-label attempts append redacted audit rows attributed to the authenticated operator.

MCP credentials are submitted once as a write-only `credential` field on register/update. The API encrypts with `SecretVaultService` (AES-256-GCM, key from `SECRET_ENCRYPTION_KEY`), stores the envelope in `workspace_secrets.encrypted_value`, and returns only `credentialSecretId`, fingerprint, and `credentialHealth`. Responses, previews, validation messages, and audit metadata run through `RedactionService` with the submitted secret registered as a canary. `encrypted_value` is never selected into HTTP DTOs.

Optimistic concurrency uses `updated_at`: PATCH must send the last seen `updatedAt`; mismatch returns 409 and does not write.

**Rationale**: FR-024–FR-030 and T089–T091. A write-once secret field avoids a Settings/secrets area (out of scope) while still never handling the value after storage. The 001 SQL type is `text`, not `bytea`; the envelope is already opaque, so T104 is resolved by documenting SQL as source of truth.

**Alternatives considered**: A separate credential-registry screen would add a product area this slice does not own. Storing plaintext maps is T089 and fails the constitution. Client-supplied `credentialSecretId` without a secret body cannot create the first credential.

## 5. Connector Check-In and Reachability Without Executor Work

**Decision**: Deliver a thin environment-side loop that cannot start work.

1. **Registration**: Deployment issues a connector registration secret. `POST /api/v1/connectors/register` authenticates that secret, creates or rotates the single active `workspace_connectors` row, and returns `connectorId` plus a one-time bearer token. Only the hash is stored. Local demo may pre-hash `ADLC_CONNECTOR_TOKEN` into the connector row so the connector can start without a UI.
2. **Check-in**: The connector process loops on `POST /api/v1/connectors/{id}/heartbeat` with version, host fingerprint, and filesystem flags. The API marks the connector `online` and updates `last_heartbeat_at`. A check-in older than 30 seconds is treated as `offline`. Heartbeat responses carry no executable payload.
3. **Typed checks**: Registering or revalidating an MCP server inserts `environment_checks` with `check_type = mcp_reachability`, `status = pending`, an expiry (10 seconds to match SC-008), the approved MCP id, URL, allowed tools, and — in memory on the TLS response to the connector only — the decrypted credential. The connector polls `GET /api/v1/connectors/{id}/checks/next`. It performs an MCP Streamable HTTP handshake (`initialize` then `tools/list`) from the environment, presenting the credential as `Authorization: Bearer <credential>` (**product owner ratification 2026-09-18**). An HTTP ping is not a handshake. It redacts errors locally and posts `POST .../checks/{id}/result`. Unexpected check ids, expired checks, and checks the platform did not issue are rejected. The connector does not accept generic commands in this slice.
4. **API never probes MCP itself.** `ConnectorCommandService` hostname heuristics are removed from the production validation path.
5. **Status rules**: If no connector is online, or a check expires unanswered, MCP `reachabilityStatus = unverified` with an actionable reason. The record is kept. Schema/label errors are `invalid`. A completed failed handshake is `unreachable` (unhealthy), not discarded.
6. **Out of scope on the connector**: `start_executor`, `stop_executor`, artifact file validation, session event ingestion. If 001 leftover command endpoints exist, 002 must not enqueue them and must not accept them as 002 evidence.

**Rationale**: FR-022a/b/c and the clarification that pulled registration, check-in, and answering platform-issued checks into this slice without pulling slice 004. Pull-based checks preserve "the connector does not require an inbound port." Sending the credential on the connector channel is required to detect "reachable but credential rejected"; the browser never sees it, and the connector must not log or persist it.

**Alternatives considered**: Probing from the API is simpler and false for VPN-only servers. Pushing checks to an inbound connector port contradicts the 001 protocol. Using the executor command queue for probes would mix 004 commands into 002 and weaken FR-022c. Unauthenticated TCP-only probes cannot satisfy the credential-rejection edge case.

## 6. Capability CRUD and Agent-Reference Guard

**Decision**: Extend the 001 capability API with get, patch, delete, entity audit, and live draft-validation. Deleting a skill or MCP is refused with 409 when any `agent_capability_attachments` row references it, and the response names the referencing agents. Demo step 24 uses a **seeded** published agent plus attachment created by test/demo setup, not by an Agent Registry UI.

**Rationale**: FR-016, FR-023, FR-031, and FR-033. Making the Agent Registry real is slice 003. The deletion guard is a Capability Registry rule that reads Agent Registry data through an explicit query/port, not an agent editor.

**Alternatives considered**: Building agent create/publish UI in 002 violates the stated scope boundary. Dropping demo step 24 would require a spec change. Asking the reviewer to SQL-insert mid-demo is not a product path.

## 7. Real-Boundary Test Path

**Decision**: Add a Playwright spec that starts (or assumes) the real web app, real API, real PostgreSQL, and real workspace connector, with **no** `page.route` / API intercepts and no in-memory repository substitutes.

Minimum automated golden path:

1. Signed-out visitor is refused workspace screens and `/api/v1/capabilities/skills`.
2. Operator signs in, sees the shell, identity, Skills and MCP rail items only, and can collapse the assistant panel across reload.
3. Operator creates a skill through the creation workspace; live validation blocks an empty required field; save appears in the entity column with attribution.
4. API process is restarted against the same database; the skill and audit entries remain.
5. Operator registers an MCP with a write-once credential against a test MCP server that only the connector network can reach; reachability becomes reachable; the credential value is absent from DOM and response bodies; at-rest `encrypted_value` is not plaintext.
6. Connector process is stopped; a new MCP is saved as unverified, not healthy or unhealthy.
7. Seeded published-agent attachment blocks deletion.

Compose (or Testcontainers) uses separate networks so the API cannot open the test MCP URL and the connector can. Unit tests may still use fakes; they are not 002 acceptance evidence. Existing spec 001 Playwright tests remain but are explicitly not evidence for this feature.

**Rationale**: Principle VI and SC-010. Spec 001's e2e suite can pass from local `useState` even when the API would 401. The new spec must fail if the API is intercepted or if PostgreSQL is replaced.

**Alternatives considered**: Trusting 001 e2e tests fails Principle VI. A UI-only Cypress against mocks is the defect this slice exists to close. Requiring a real VPN MCP in CI is the demo, not the default pipeline.

## 8. Status Mapping

**Decision**: Do not invent status colors. Map capability states into the UI guideline families:

| Domain state | Family | Color |
|---|---|---|
| valid + reachable | completed/healthy | emerald |
| pending_validation, unverified, environment offline | waiting/degraded | amber |
| invalid, unreachable, credential missing/rejected | failed/error | red |
| idle/paused | slate | slate |

`unverified` is a new domain value, not a new color.

**Rationale**: FR-011.

## Research Outcome

All Technical Context unknowns are resolved. Two product confirmations are recorded as planning defaults rather than blockers: idle/absolute session lifetimes (8h/24h) and demo step 24 using a seeded published agent. See the plan report for those confirmations.

The design can satisfy Principle VI if implementation follows this research: the shell is consumed by Skills and MCP in the same release, identity is platform-established, durability is PostgreSQL, reachability is environment-measured, and at least one automated path crosses browser → API → database with no intercepts.
