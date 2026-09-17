# Module Plan: Platform Chat

## Purpose

The Platform Chat is a built-in ADLC-managed system agent for asking about and operating the platform.

It is not just another agent chat. It is the conversational interface to the product's own state.

## User Jobs

- Ask what is running now.
- Ask which sessions failed.
- Ask what approvals are pending.
- Ask which agents use a specific MCP or skill.
- Ask for summaries of recent workflow runs.
- Resolve pending workflow actions when it has enough confirmed information.
- Help create and configure agents, workflows, capabilities, and workspace settings step by step.
- Navigate to relevant sessions, agents, traces, and artifacts.

## Example Prompts

- "What agents are running right now?"
- "Show failed sessions from today."
- "Which agents use the GitHub MCP?"
- "What approvals are blocking the release workflow?"
- "Summarize the last incident response run."
- "Start an SRE incident workflow for checkout latency."

## Architecture

The chat should use a retrieval/action layer over platform data:

1. Classify user intent.
2. Query local platform state where possible.
3. Use an LLM for summarization and natural language response.
4. Require explicit confirmation before state-changing actions.
5. Return links/buttons to concrete entities.

## R0 Capabilities

Read-only:

- status summaries
- failed session lookup
- approval queue summary
- agent/capability usage lookup
- workflow run summary

Assisted configuration with confirmation:

- create agent drafts
- stage edits to published agents as draft changes
- configure workflow steps one decision at a time
- attach skills and MCPs by reference
- update workspace settings

State-changing operational commands with confirmation:

- start workflow
- start agent session
- cancel session
- approve/reject action

## R0 API Surface

- `POST /platform-chat/threads`
- `GET /platform-chat/threads`
- `GET /platform-chat/threads/:id`
- `POST /platform-chat/threads/:id/messages`

## Tooling Model

Platform Chat can use internal tools:

- query agents
- query workflows
- query sessions
- query approvals
- query capabilities
- start workflow
- start session
- create agent draft
- update draft configuration
- create or update pending command

These are application tools, not necessarily OpenAI Agents API tools.

## Risks

- Chat hallucinates platform state.
- Chat performs actions without confirmation.
- Chat becomes a generic assistant instead of an operations console.
- Chat silently changes published configuration.

## R0 Constraints

- Ground answers in database queries.
- Show cited entity links for status answers.
- Require confirmation for state changes.
- Log chat-initiated actions in audit history.
- Create agents as drafts only; publishing requires separate confirmation.
- Do not support unrestricted natural-language full workflow generation in R0.
