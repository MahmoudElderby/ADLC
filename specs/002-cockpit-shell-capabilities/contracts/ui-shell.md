# UI Shell Contract — Slice 002

Binding visual and interaction contract. Geometry and product rules come from
`docs/07-frontend-ui-guidelines.md`. Tokens, typography, component recipes, and
motion come from `apps/Debate AI SDLC Command Center UI/DESIGN_SYSTEM.md` and
`apps/Debate AI SDLC Command Center UI/src/DesignSystem.tsx`. This file maps
them onto the screens this slice actually ships.

Constitution Principle VII: CSS variables or column widths without those
primitives are not compliance. Production chrome lives in `@adlc/ui`.

## Shell geometry

```text
Top bar:          40px high
Icon rail:        56px fixed width
Entity column:    260px fixed width
Main workspace:   flex area
Assistant panel:  320px expanded, 40px collapsed, or hidden
```

The assistant panel resizes the main workspace. It must not overlay workspace content.

## Product areas in this slice

Rail items, in order:

| Area | Route prefix | Entity column |
|---|---|---|
| Skills | `/skills` | registered skills |
| MCP Servers | `/mcp` | registered MCP servers |

Default landing after sign-in: `/skills`.

No other rail item is rendered. Deep links to 001 routes such as `/command-center`, `/agents/*`, or `/sessions/*` are either removed from this slice's router or redirect through sign-in to Skills; they must not appear as navigation targets.

Sign-in lives outside the shell at `/sign-in`.

## Addressable views

| View | Path |
|---|---|
| Sign in | `/sign-in` |
| Skills list / empty registry | `/skills` |
| Skill creation | `/skills/new` |
| Skill detail / edit | `/skills/:skillId` |
| MCP list | `/mcp` |
| MCP creation | `/mcp/new` |
| MCP detail / edit | `/mcp/:mcpId` |

Unauthenticated requests to any of these except `/sign-in` show the sign-in screen, preserve `next`, and disclose no workspace names, entity lists, or field values.

## Creation workspace

Clicking `+` in the entity column opens creation in the main workspace. Entity column and assistant panel remain visible. No modal is the primary creation surface.

The main workspace for create/edit contains:

1. Form fields for the entity
2. A review/validation panel with blocking errors vs warnings
3. A configuration preview generated from current form state (JSON, monospace)
4. Explicit save

Live validation updates while the user types (SC-008: visible within 1 second). Save is refused while blocking errors remain.

## Assistant panel

States: expanded, collapsed, hidden. Choice persists in `localStorage` across navigation and reload. The panel body is an empty operational region with no conversation, no composer, and no fake messages. A context strip may show the current area/entity name.

## Visual tokens and primitives

Use the graphite palette and status families from `DESIGN_SYSTEM.md` only.
Human-facing copy: Inter. Machine-facing metadata (ids, versions, URLs, tool
names, timestamps, JSON preview): JetBrains Mono. Cyan is the only interactive
accent. Purple is not used.

Every shipped screen in this slice MUST use the `@adlc/ui` primitives that
mirror `DesignSystem.tsx`:

| Surface | Required recipe |
|---|---|
| Navigation rail | Icon-only items from the `I` catalog, cyan when active, `aria-label` for the area name |
| Entity column | ALL-CAPS header, `+` create action, StatusDot + title + metadata rows, selected row cyan left border |
| Workspace / creation header | StatusDot, entity name, ID chip, primary/secondary/danger buttons |
| Forms | Field + FormSection, shared input base, live validation panel, monospace JSON preview |
| Assistant | Expanded 320px / collapsed 40px icon strip / hidden; no fake conversation |
| Sign-in | Same tokens and Field/button recipes, outside the shell |

Inline `style` objects MUST NOT encode static design tokens.

Status mapping for this slice is in `research.md` section 8.

## Identity chrome

The top bar shows the operator display name and workspace name after sign-in, plus a sign-out action. It shows whether the execution environment is currently able to perform reachability checks (online vs offline/unverified), without exposing connector tokens.
