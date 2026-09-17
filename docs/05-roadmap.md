# Roadmap

## R0: Control Plane Walking Skeleton

Goal: prove that users can configure agents, attach capabilities, run sessions, monitor live activity, and ask the platform about current state.

Include:

- Workspace setup with OpenAI project/API key
- Agent Registry
- Capability Registry for MCPs and skills
- Workspace Environment Settings
- Session Runner with streaming
- Command Center Dashboard
- Live Agent Fleet Canvas
- Platform Chat for status queries
- Session/event persistence
- Markdown artifact metadata and file-reference handoff
- Basic approval queue
- Simple workflow builder

Success signal:

- A user can register a skill and MCP, create and publish an agent, run an OpenAI-managed session in the workspace self-hosted environment, produce a Markdown artifact file, track that artifact in ADLC, inspect events/tool calls, see the run in the live fleet view, and ask Platform Chat for status.

## R1: SDLC Workflow Depth

Goal: make the workflow orchestrator useful for real SDLC flows.

Add:

- Workflow templates
- Step input/output mapping
- Multi-agent workflow runs
- Better approval policies
- Artifact handoff between workflow steps
- GitHub/GitLab MCP examples
- Run comparison
- Failure recovery actions

## R2: Team Governance

Goal: make it credible for teams and organizations.

Add:

- Role-based access control
- SSO
- Audit export
- Workspace-level policy templates
- Secret rotation
- Cost and usage budgets
- Environment risk classification
- Approval policy library

## R3: Ecosystem and Scale

Goal: make the platform extensible.

Add:

- Skill/plugin packaging UI
- MCP marketplace/registry
- Self-hosted environment manager
- Webhook ingestion
- Advanced observability
- Evaluations for agent workflows
- Enterprise deployment options
