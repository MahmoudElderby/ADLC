# Business Plan

## Category

The product sits between:

- AI agent builders
- Developer productivity platforms
- Internal developer portals
- Workflow automation tools
- AI observability tools
- SDLC management platforms

The wedge is not "build an agent." The wedge is "operate AI agents safely across the SDLC."

## Ideal Customer Profile

### Primary ICP

AI-forward engineering teams with enough complexity to need governance:

- 10-200 engineers
- Existing SDLC process
- Multiple repositories or services
- Need for internal tooling
- Interested in agentic automation
- Concerned about permissions, auditability, and reliability

### First Buyer or Champion

- CTO at an AI-forward startup
- Head of Engineering
- Platform Engineering Lead
- SRE Lead
- Developer Productivity Lead
- Staff Engineer owning internal AI tools

## Jobs To Be Done

### Functional Jobs

- Configure agents for repeatable engineering tasks.
- Attach the right tools and skills to each agent in the shared workspace environment.
- Run agents and monitor progress.
- Create SDLC workflows from multiple agents.
- Inspect what happened during an agent run.
- Gate risky actions behind approvals.
- Reuse successful agent configurations.

### Emotional Jobs

- Feel in control of autonomous agents.
- Trust that agents are not acting invisibly.
- Reduce fear around production-adjacent automation.
- Make AI adoption feel systematic instead of experimental.

### Business Jobs

- Reduce engineering cycle time.
- Improve repeatability of planning, review, QA, release, and incident work.
- Make AI agent usage auditable.
- Standardize internal agent workflows across teams.

## Differentiation

The product should differentiate on four axes:

1. **SDLC-native orchestration**
   The product understands product, architecture, implementation, review, QA, release, and incident workflows.

2. **Capability governance**
   MCPs, skills, tools, credentials, and workspace access are managed as reusable, permissioned capabilities.

3. **Live agent operations**
   The dashboard shows active agents, subagents, sessions, tool calls, approvals, and failures in real time.

4. **Operational chat**
   Users can ask the platform about its own state and launch controlled workflows through a command-style chat.

## Core Personas

### Platform Engineer

Owns the capability registry, workspace environment settings, policies, and integrations.

Needs:

- Safe defaults
- Clear permissions
- Audit trails
- Reusable templates
- Easy troubleshooting

### Engineering Manager

Owns team workflows and delivery visibility.

Needs:

- Workflow status
- Bottleneck visibility
- Run history
- Approval queues
- Reliable run history and auditability

### Staff Engineer

Owns workflow design and technical standards.

Needs:

- Agent configuration
- Workflow composition
- Integration with repositories and tools
- Evidence and traceability

### SRE Lead

Owns incident workflows and production safety.

Needs:

- Read-only investigation defaults
- Approval gates for risky actions
- Timeline and evidence capture
- Integration with logs, runbooks, incidents, and deployments

## R0 Business Scope

R0 should prove that the product can manage a team-scale agent fleet.

Include:

- Agent registry
- Capability registry
- Workspace environment settings
- Session runner
- Live dashboard
- Basic workflow builder
- Platform chat for status
- OpenAI Agents API integration
- Event history and Markdown artifact handoff tracking
- Approval queue

Exclude:

- Full marketplace
- Multi-tenant enterprise billing
- Multiple environment profiles
- OpenAI-hosted R0 sandboxes
- Custom agent runtime or harness
- Deep CI/CD replacement
- Full Jira/Linear replacement
- Fine-grained RBAC beyond owner/admin/operator roles
- Complex visual workflow branching engine

## Pricing Hypothesis

Initial pricing should be workspace based:

- Developer preview: free or founder plan
- Team: per-seat plus workflow and run history visibility
- Enterprise: SSO, audit exports, private deployment, governance controls

The product should let customers bring their own OpenAI project/API key in early versions. Dedicated usage and cost dashboards are deferred until the core fleet execution, orchestration, approvals, and observability loop is working.

## North Star Metric

Weekly successful agent-run workflows per active workspace.

Supporting metrics:

- Agents configured
- Sessions started
- Workflows completed
- Approval gates resolved
- Failed runs recovered
- Artifacts created
- Reused workflow templates
