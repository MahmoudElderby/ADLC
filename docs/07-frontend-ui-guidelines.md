# Frontend UI Guidelines

## Source

These guidelines are the durable product-level UI contract. They are distilled
from the in-repo design system at:

```text
apps/Debate AI SDLC Command Center UI/DESIGN_SYSTEM.md
apps/Debate AI SDLC Command Center UI/src/DesignSystem.tsx
apps/Debate AI SDLC Command Center UI/src/index.css
```

`DESIGN_SYSTEM.md` is the written specification. `DesignSystem.tsx` is the
visual and component specification: tokens, StatusDot, Badge, Brackets, button
variants, Field / FormSection, inputs, entity rows, workspace header, creation
workspace, validation panel, and motion. Constitution Principle VII binds both.

The prototype `App.tsx` is a composition example for later screens. Do not copy
it wholesale as application source. Do port every primitive `DesignSystem.tsx`
defines into `@adlc/ui`, and compose production pages from those primitives.

Extracting only hex colors or shell widths is not compliance.

## Product Feel

ADLC should feel like an AI engineering cockpit, not a generic SaaS dashboard.
The visual language is calm, technical, dense, and operational. Every visible
object should either communicate status or be meaningfully clickable.

Design principles:

- Precision over decoration.
- Operational density over spaciousness.
- Status visible at a glance.
- Calm cybernetic command center, not fake hacker theater.
- No marketing-style landing page patterns inside the app.
- No decorative charts, cartoon robots, code rain, sci-fi orbs, or excessive neon.

## App Shell

Use a sliced workspace pattern:

```text
Top bar:          40px high
Icon rail:        56px fixed width
Entity column:    260px fixed width, hidden/minimized for Command Center when useful
Main workspace:   flex area
Platform Chat:    320px expanded, 40px collapsed, or hidden by user toggle
```

The right-side Platform Chat must resize the main workspace when expanded. It
must not overlay core workspace content.

Primary shell areas:

- Far-left icon rail for major product areas.
- Entity browser column for the selected product area.
- Main workspace for the selected area or entity.
- Global Platform Chat panel available across screens.

Major product areas:

- Command Center
- Agents
- Workflows
- Sessions
- Approvals
- Artifacts
- Skills
- MCP Servers
- Workspace Environment
- Traces
- Settings

## Navigation Behavior

Click behavior must be predictable:

- Clicking an icon rail item changes the active product area and entity column.
- Clicking an entity row opens that entity in the main workspace.
- Clicking the entity column add button starts creation for that entity type.
- Clicking a metric tile navigates to the relevant section or filtered list.
- Clicking an active agent on the Command Center opens its session.
- Clicking a subagent opens its trace/details.
- Clicking an approval indicator opens the approval detail.
- Clicking a chat action button navigates or executes the suggested action after
  confirmation when state changes are involved.

Entity rows should behave like an object browser. They show status, title,
short metadata, and last-run or timestamp information.

## Command Center Rules

Command Center is the operational cockpit, not the configuration area.

The main Command Center canvas must focus on active running main agents,
subagents, approval-needed states, and live operational status. It must not turn
into a historical list view.

Do not show these on the main Command Center canvas:

- idle agents
- completed sessions
- historical lists
- recent artifact lists
- recent event streams

Those belong in their own screens or filtered lists. Metric tiles can navigate
to those screens.

Use the Live Agent Fleet Canvas for active operational topology:

- main agent nodes
- subagent nodes
- MCP/tool routes
- attached skill indicators
- approval gates
- failed/risky states
- artifact output indicators

Animations must remain subtle and operational.

## Platform Chat Rules

Platform Chat is a command assistant, not a casual chatbot. It should understand
the current selected screen/entity context and answer from platform data.

It should support:

- expanded state at 320px
- collapsed state at 40px
- hidden state by explicit user toggle
- context strip showing the current area/entity
- action buttons such as open session, open approval, open trace, view config,
  retry failed run, start run, or resume workflow

Assistant action buttons that mutate state must go through the existing
confirmation and audit boundary.

## Visual System

Use a dark graphite UI:

- page background: near-black
- panels: layered charcoal
- primary interactive accent: cyan only
- running/healthy/success: emerald
- waiting/approval/warning: amber
- failed/error/high-risk/destructive: red
- primary text: soft white
- secondary text: muted blue-gray
- dividers: thin, low-contrast borders

Do not introduce a second interactive accent color. Purple is reserved and not
used in R0 UI.

Suggested token values from the reference artifact:

| Purpose | Value |
|---|---|
| Deep background | `#0A0B0D` |
| Panel 1 | `#0D0F13` |
| Panel 2 | `#13151A` |
| Panel 3 / hover | `#1A1D24` |
| Hairline border | `#1E2129` |
| Elevated border | `#2A2F3A` |
| Primary text | `#F1F5F9` |
| Muted text | `#8892A4` |
| Dim text | `#4A5568` |
| Cyan accent | `#06B6D4` |
| Emerald status | `#10B981` |
| Amber status | `#F59E0B` |
| Red status | `#EF4444` |

## Typography

Use a split typography model:

- Human-facing UI copy: Inter or equivalent clean sans-serif.
- Machine-facing metadata: JetBrains Mono or equivalent monospace.

Use monospace for:

- IDs
- model names
- version strings
- tool names
- MCP names
- commands
- event names
- timestamps
- numeric values in metric tiles
- JSON/config previews
- log lines

Use compact labels. Section labels use uppercase, small text, and wide tracking.

## Status Semantics

Status colors must be consistent across rows, badges, dots, canvas nodes, and
headers.

| Status family | Color |
|---|---|
| running, active | cyan, pulsing only where appropriate |
| completed, done, connected, healthy, stable, published | emerald |
| waiting, blocked, degraded, beta, draft, low risk | amber |
| failed, error, high risk, destructive | red |
| idle, paused | slate |

Do not invent new status colors. Map new states into these families unless the
design system is amended.

## Forms and Creation

Entity creation should use a creation workspace, not modal dialogs.

Creation pattern:

1. User clicks `+` in the entity column.
2. The app opens a creation mode menu.
3. R0 should prioritize blank/manual creation.
4. The main workspace changes to the creation/editing form.
5. Entity column and Platform Chat remain visible.
6. A review/validation panel shows live validation and generated JSON/config
   preview.
7. Save draft and publish/confirm actions are separate when publishing matters.

R0 should not rely on starter templates for agent creation. Template and import
patterns may be documented as later enhancements.

Validation rules:

- Show live validation while the user edits.
- Errors block publish/confirm.
- Warnings are non-blocking.
- JSON/config preview updates from form state.
- State-changing saves and publishes remain explicit.

## Workspace Detail Screens

Use tabs where they clarify entity detail without turning pages into clutter.

Examples:

- Session: Trace, Output, Config
- Agent: Overview, Configuration, Capabilities, Sessions, Versions
- Workflow: Canvas, Runs, Config, Approvals
- MCP Server: Config, Allowed Tools, Status, Usage
- Skill: Details, Versions, Compatibility, Usage
- Approval: Details, Decision History
- Trace: Timeline, Raw Events

Every workspace header should show:

- selected entity name
- status indicator
- short ID chip where applicable
- important runtime metadata
- primary actions relevant to that entity

## Interaction and Motion

Motion should clarify live state, not decorate.

Allowed patterns:

- subtle pulsing status dots for running/active only
- subtle node rings on active or blocked canvas agent nodes
- low-opacity canvas scanline on Command Center only
- dashed connector motion for active canvas routes

Avoid broad animation primitives. Prefer targeted color or property transitions.

## Implementation Notes

The design system uses React, Vite, and Tailwind CSS v4. Production code MUST
use the same utility recipes as `DesignSystem.tsx`. Inline `style` objects MUST
NOT encode static design tokens; use them only for dynamic or computed values.

`@adlc/ui` is the production home for tokens, icons, StatusDot, Badge,
Brackets, buttons, Field / FormSection, entity rows, workspace chrome, and the
creation-workspace layout. `apps/web` owns routes, data fetching, and page
composition only.

Prefer production component organization over copying the prototype's single
large `App.tsx`. When a later slice adds a screen that already exists in the
prototype, match its visual language by composing `@adlc/ui` primitives — do
not restyle from scratch and do not invent a second component language.
