# AI SDLC Command Center — Design System

Version 1.0 · React 19 + Vite 8 + Tailwind CSS v4

---

## Philosophy

The product is an **AI engineering cockpit**, not a SaaS dashboard. Every design decision should reinforce: precision, operational density, and calm authority. The visual language is cybernetic — dark, monospaced, minimal decoration, maximum signal.

**Core principles:**
1. Every visible object is meaningful and clickable
2. Status is always visible at a glance
3. Density over spaciousness — this is a power-user tool
4. Single accent color. One. Cyan only.
5. Monospace for everything machine-generated, sans-serif for everything human-written

---

## Color System

All tokens are defined in `src/index.css` under `@theme inline`. Use them as Tailwind utility classes.

### Background layers (darkest → lightest)

| Token          | Hex       | Tailwind class          | Usage                                    |
|----------------|-----------|-------------------------|------------------------------------------|
| `--color-bg`   | `#0A0B0D` | `bg-[#0A0B0D]`          | Page shell, canvas, deepest background   |
| Panel 1        | `#0D0F13` | `bg-[#0D0F13]`          | Icon rail, entity column, chat panel     |
| Panel 2        | `#13151A` | `bg-[#13151A]`          | Cards, form sections, secondary panels   |
| Panel 3        | `#1A1D24` | `bg-[#1A1D24]`          | Hover states, selected rows, active tabs |

### Borders

| Token              | Hex       | Tailwind class      | Usage                                |
|--------------------|-----------|---------------------|--------------------------------------|
| `--color-border`   | `#1E2129` | `border-[#1E2129]`  | Primary hairline dividers            |
| `--color-border-2` | `#2A2F3A` | `border-[#2A2F3A]`  | Elevated borders, hover, active      |

**Rule:** Never use `border-gray-*` or `border-white/*`. Only these two border values.

### Text hierarchy

| Token            | Hex       | Tailwind class        | Usage                                       |
|------------------|-----------|-----------------------|---------------------------------------------|
| `--color-text`   | `#F1F5F9` | `text-[#F1F5F9]`      | Primary text, headings, entity names        |
| `--color-muted`  | `#8892A4` | `text-[#8892A4]`      | Secondary labels, descriptions              |
| Secondary        | `#C4CDD8` | `text-[#C4CDD8]`      | Entity row text, form values                |
| `--color-dim`    | `#4A5568` | `text-[#4A5568]``     | Tertiary labels, icon defaults, hints       |
| Faint            | `#3A4255` | `text-[#3A4255]`      | Placeholders, log lines, timestamps         |
| Ultra-faint      | `#2A2F3A` | `text-[#2A2F3A]`      | Canvas decorations, grid labels             |

### Semantic accent colors

| Name    | Hex       | Usage                                              |
|---------|-----------|----------------------------------------------------|
| Cyan    | `#06B6D4` | **Only interactive accent.** Active nav, focus, links, primary buttons, selected state |
| Cyan dim| `#0891B2` | Cyan hover variant                                 |
| Emerald | `#10B981` | Running, healthy, connected, success, done         |
| Amber   | `#F59E0B` | Approvals, waiting, blocked, warnings, beta        |
| Red     | `#EF4444` | Failed, error, high-risk, destructive              |
| Purple  | `#8B5CF6` | Reserved — not yet used in UI                     |

### Semantic color backgrounds (for badges, panels)

```
Cyan surface:    bg-cyan-950/60    border: border-cyan-800/60     text: text-cyan-300
Emerald surface: bg-emerald-950/60 border: border-emerald-800/60  text: text-emerald-300
Amber surface:   bg-amber-950/60   border: border-amber-800/40    text: text-amber-300
Red surface:     bg-red-950/60     border: border-red-800/40      text: text-red-300
Slate surface:   bg-[#1E2129]      border: border-[#2A2F3A]       text: text-[#8892A4]
```

### Glow shadows

Used on agent nodes and metric tiles. Never add glows to generic UI elements.

```css
/* Cyan glow — active/running nodes */
box-shadow: 0 0 20px rgba(6, 182, 212, 0.22), 0 0 0 1px rgba(6, 182, 212, 0.12);

/* Amber glow — blocked/approval-needed nodes */
box-shadow: 0 0 16px rgba(245, 158, 11, 0.12);

/* Metric tile glows */
box-shadow: 0 0 12px rgba(6, 182, 212, 0.2);   /* cyan tile */
box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);  /* amber tile */
box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);   /* red tile */
```

---

## Typography

### Font families

```css
/* src/index.css — loaded via Google Fonts */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Inter** — all UI copy, labels, headings, descriptions, form text.
**JetBrains Mono** — IDs, entity IDs, model names, commands, tool names, code, JSON, log lines, technical metadata, version strings, timestamps, numeric values in metric tiles.

### Size scale

| Class          | Size   | Weight      | Usage                                          |
|----------------|--------|-------------|------------------------------------------------|
| `text-sm`      | 14px   | 600         | Workspace section headings, entity names       |
| `text-[13px]`  | 13px   | 400–500     | Form inputs, descriptions, body text           |
| `text-[12px]`  | 12px   | 400–500     | Row text, log lines, chat messages             |
| `text-[11px]`  | 11px   | 400–500     | Secondary row metadata, validation messages    |
| `text-[10px]`  | 10px   | 400–600     | Log timestamps, section sub-labels             |
| `text-[9px]`   | 9px    | 400         | Canvas status bar labels, ultra-compact chips  |

### Section labels (ALL CAPS pattern)

All section headers use this pattern:
```
text-[10px] font-semibold tracking-widest uppercase text-[#4A5568]
```
Or `text-[11px]` for entity column section titles.

### ID chips (monospace inline)

```
font-mono text-[10px] text-[#3A4255] bg-[#13151A] px-2 py-0.5 rounded border border-[#1E2129]
```

---

## Spacing

Tailwind's default spacing scale applies. Key values used in this product:

| Value | px  | Usage                                          |
|-------|-----|------------------------------------------------|
| `1`   | 4px | Icon gaps, micro-spacing inside chips          |
| `2`   | 8px | Icon + label gaps, vertical stacking           |
| `3`   | 12px| Card internal padding (compact)               |
| `4`   | 16px| Standard card/section padding                 |
| `5`   | 20px| Workspace horizontal padding                  |
| `6`   | 24px| Generous workspace padding                    |

---

## Border Radius

| Class        | Value  | Usage                              |
|--------------|--------|------------------------------------|
| `rounded`    | 4px    | Tiny chips, kbd elements           |
| `rounded-lg` | 8px    | Inputs, buttons, small cards       |
| `rounded-xl` | 12px   | Form sections, entity cards, menus |
| `rounded-2xl`| 16px   | Agent nodes, large canvas cards    |
| `rounded-full`| 9999px| Dots, avatars, toggle pills       |

---

## Layout System

The app uses a **sliced workspace pattern**. All columns are fixed-width except the main workspace, which takes `flex-1`.

```
┌─────────────────────────────────────────────────────────┐
│  TopBar  (h-10, 40px)                                   │
├────┬──────────┬───────────────────────────┬─────────────┤
│    │          │                           │             │
│ Icon│ Entity  │   Main Workspace          │  Chat Panel │
│ Rail│ Column  │   (flex-1)                │  (320px or  │
│(56px│(260px)  │                           │   40px)     │
│    │          │                           │             │
└────┴──────────┴───────────────────────────┴─────────────┘
```

### Column specs

| Column       | Width    | Class          | Notes                                  |
|--------------|----------|----------------|----------------------------------------|
| Icon rail    | 56px     | `w-14`         | Never resizes                          |
| Entity column| 260px    | `w-[260px]`    | Hidden when `nav === 'command'`        |
| Main workspace| flex-1  | `flex-1`       | Takes remaining space                  |
| Chat — expanded | 320px | `w-80`        | Full chat panel                        |
| Chat — collapsed| 40px  | `w-10`        | Icon strip only                        |

### Top bar spec

- Height: `h-10` (40px)
- Background: `bg-[#0A0B0D]` (same as shell — no elevation)
- Border: `border-b border-[#1E2129]`
- Contains: org switcher | product name | spacer | ⌘K search | running count | notifications | Assistant toggle | avatar

### Entity column header spec

- Height: `h-10` (40px)
- Border: `border-b border-[#1E2129]`
- Contains: ALL CAPS section label (left) + filter icon + add icon (right)

### Workspace header spec

- Height: `h-10` (40px)
- Border: `border-b border-[#1E2129]`
- Contains: status dot + entity name + ID chip + metadata | action buttons (right)

---

## Components

### StatusDot

A pulsing presence indicator. The outer ring animates for `running` and `active` states only.

```tsx
<StatusDot status="running" />   // cyan pulsing
<StatusDot status="completed" /> // emerald solid
<StatusDot status="waiting" />   // amber solid
<StatusDot status="failed" />    // red solid
<StatusDot status="idle" />      // slate solid
```

**Status → color mapping:**

| Status              | Color    |
|---------------------|----------|
| running, active     | cyan-400 + pulse |
| completed, done, connected, healthy, stable | emerald-400 |
| idle, paused        | slate-600 |
| failed, error       | red-400   |
| degraded, waiting, beta | amber-400 |

### Badge

Small monospace chip for status labels, entity tags, and version numbers.

```tsx
<Badge label="RUNNING"   variant="cyan" />
<Badge label="PUBLISHED" variant="emerald" />
<Badge label="FAILED"    variant="red" />
<Badge label="WAITING"   variant="amber" />
<Badge label="DRAFT"     variant="slate" />
```

Anatomy: `inline-flex | px-1.5 py-0.5 | rounded | text-[10px] font-medium border | font-mono tracking-wide`

### Brackets

Corner bracket decoration for primary/active cards. Uses 4 absolute-positioned spans.

```tsx
<div className="relative">
  <Brackets color="#06B6D4" size={7} />   // cyan — active/running
  <Brackets color="#b45309" size={8} />   // amber — blocked/waiting
</div>
```

**Rule:** Parent must have `relative` positioning. Use only on agent node cards, template cards, and "selected" states. Not on every card.

### SvgIcon

All icons are rendered through this single primitive. Icon paths are stored in the `I` object.

```tsx
<SvgIcon d={I.agents} size={16} className="text-[#4A5568]" />
<SvgIcon d={I.artifacts} size={14} className="text-[#06B6D4]" /> // multi-path array
```

Default stroke: `strokeWidth="1.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

**Icon catalog** (defined in `I` object in `App.tsx`):

```
command, agents, workflows, sessions, approvals, artifacts, skills, mcp,
environments, traces, settings, search, bell, chevRight, chevDown, chevLeft,
chevUp, plus, play, terminal, check, x, send, chat, filter, lock, eye,
externalLink, zap, more, alertTriangle, link, activity, copy, cpu,
fileBlank, template, uploadCloud, checkCircle, alertCircle, infoCircle,
sliders, rotateCw, shield, code, toggleRight, toggleLeft
```

---

## Form System

### Input primitives

All inputs share a common base class:
```
bg-[#0A0B0D] border border-[#1E2129] rounded-lg px-3
text-[13px] text-[#F1F5F9] placeholder-[#3A4255]
outline-none transition-colors
focus:border-[#06B6D4]/60 hover:border-[#2A2F3A]
```

Error state adds: `border-red-500/60 focus:border-red-500/80`
Mono variant adds: `font-mono text-[12px]`

**Components available:**
- `TInput` — standard text input
- `TTextarea` — resizable=none textarea, configurable rows
- `TSelect` — styled native select
- `TToggle` — pill toggle switch with cyan active state
- `RangeInput` — range slider with numeric value display (monospace, cyan)

### Field wrapper

Wraps any input with label, required marker, error message, and hint text.

```tsx
<Field label="Agent Name" required hint="Used in logs and dashboards" error="Name is required">
  <TInput value={name} onChange={setName} placeholder="e.g. CodeReviewBot" />
</Field>
```

- Label: `text-[11px] font-medium text-[#8892A4] uppercase tracking-wider`
- Required asterisk: `text-[10px] text-red-400 font-mono`
- Error: red-400 with alertCircle icon, shown below input
- Hint: `text-[10px] text-[#3A4255]`, only shown when no error

### FormSection

Collapsible card grouping related fields.

```tsx
<FormSection title="Basics" icon={I.infoCircle} defaultOpen>
  {/* fields */}
</FormSection>
```

- Header background: `bg-[#13151A]`, hover: `bg-[#1A1D24]`
- Body background: `bg-[#0D0F13]`
- Border: `border border-[#1E2129] rounded-xl`
- Section label: ALL CAPS, `text-[11px] font-semibold tracking-widest uppercase text-[#6B7894]`

---

## Creation Pattern

The Add Entity flow is consistent across all entity types.

### Trigger
`+` button in the entity column header → `CreationModeMenu` popover

### Mode menu
Small absolute-positioned popover with 3 options:
1. **Blank** — empty form
2. **From template** — template picker → pre-filled form
3. **Import / Paste** — JSON textarea → parse → pre-filled form

### Creation workspace layout
Replaces the main workspace. Entity column and chat panel remain visible.

```
┌─────────────────────────────────────────────────────────┐
│ [Header: entity name | status badge | Cancel | Save | Publish] │
├─────────────────────────────────┬───────────────────────┤
│  Form (flex-1, overflow-y-auto) │  Review (w-72)        │
│  FormSection: Basics            │  Validation panel     │
│  FormSection: Capabilities      │  ─────────────────    │
│  FormSection: Runtime Config    │  JSON Preview         │
│  FormSection: Environment       │  (syntax highlighted) │
└─────────────────────────────────┴───────────────────────┘
```

### Validation panel rules
- Shows live as user types — not on submit
- Errors: red-400 background, must be resolved before Publish is enabled
- Warnings: amber-400 background, non-blocking
- OK: emerald-400 background, confirms fields are valid
- Publish button is `disabled` while any error exists

### JSON preview
- Generated from live form state — updates on every keystroke
- Syntax highlighted via `dangerouslySetInnerHTML` (safe: value is generated, not user-pasted)
- Key: `text-[#6B7894]` | String values: `text-[#06B6D4]` | Numbers: `text-amber-400` | Booleans/null: `text-emerald-400`
- Copy button in header

---

## Animation & Motion

All animations are defined as CSS keyframes in `src/index.css`.

| Class                  | Keyframe     | Duration | Usage                                     |
|------------------------|--------------|----------|-------------------------------------------|
| `animate-scanline`     | `scanline`   | 7s linear| Canvas ambient scan line (top-to-bottom)  |
| `animate-dashflow`     | `dashflow`   | 1.2s linear| SVG dashed connector lines (draw-on)   |
| `animate-node-ring`    | `nodeRing`   | 2s ease-out| Cyan pulse ring on running agent nodes |
| `animate-amber-ring`   | `amberRing`  | 2.4s ease-out| Amber pulse ring on blocked nodes    |
| Tailwind `animate-ping`| built-in     | 1s       | StatusDot pulse for running/active status |
| Tailwind `animate-bounce`| built-in   | 1s       | Chat typing indicator dots               |
| `animate-spin`         | built-in     | 1s       | Test connection rotate icon              |

**Rules:**
- Canvas scan line: use once per canvas, very low opacity (0.03–0.25 range)
- Pulse rings: agent node cards only — never on form elements or list rows
- `animate-ping`: StatusDot only
- Never use `transition-all` — always `transition-colors` or `transition-[specific-property]`

---

## Canvas System

### Dot grid

```css
.canvas-dot-grid {
  background-image: radial-gradient(circle, #1E2129 1px, transparent 1px);
  background-size: 28px 28px;
}
```

Used only on the Command Center canvas workspace. Not on panels or forms.

### Vignette overlay

```css
background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(10,11,13,0.6) 100%)
```

Applied as a non-interactive overlay on top of the dot grid.

### Canvas status bar

Fixed to bottom of canvas, `bg-[#0A0B0D]/80 backdrop-blur-sm`, `border-t border-[#1E2129]/50`, `pointer-events-none`.

---

## Interaction Patterns

### Click hierarchy

| Target                         | Action                              |
|--------------------------------|-------------------------------------|
| Icon rail item                 | Change active nav section + entity column |
| Entity column row              | Open entity in main workspace       |
| `+` button in entity column    | Show creation mode menu             |
| Metric tile (Command Center)   | Navigate to that section            |
| Agent node (canvas)            | Open its session in workspace       |
| Approval badge (canvas)        | Open approval detail in workspace   |
| Chat action button             | Navigate or execute suggested action|

### Selection state (entity column rows)

Selected row: `bg-[#101318] border-l-2 border-l-[#06B6D4] pl-[10px]`  
Unselected hover: `hover:bg-[#13151A]`

### Button variants

| Variant         | Classes                                                                                |
|-----------------|----------------------------------------------------------------------------------------|
| Primary (cyan)  | `bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] hover:bg-[#06B6D4]/20`    |
| Secondary       | `bg-[#13151A] border border-[#2A2F3A] text-[#8892A4] hover:border-[#4A5568]`          |
| Danger          | `bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/60`             |
| Success         | `bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60` |
| Ghost           | Text only: `text-[#4A5568] hover:text-[#8892A4]`                                     |
| Disabled        | Add `opacity-30 cursor-not-allowed` to any variant                                    |

All buttons: `rounded-lg text-[11px] font-medium px-3 py-1.5 transition-all`

---

## Status Semantics

Use these mappings consistently across the entire product. Never invent new status values.

| Status      | Color    | StatusDot | Badge variant |
|-------------|----------|-----------|---------------|
| `running`   | cyan     | pulsing   | cyan          |
| `active`    | cyan     | pulsing   | cyan          |
| `waiting`   | amber    | solid     | amber         |
| `blocked`   | amber    | solid     | amber         |
| `completed` | emerald  | solid     | emerald       |
| `done`      | emerald  | solid     | emerald       |
| `connected` | emerald  | solid     | emerald       |
| `healthy`   | emerald  | solid     | emerald       |
| `stable`    | emerald  | solid     | emerald       |
| `idle`      | slate    | solid     | slate         |
| `paused`    | slate    | solid     | slate         |
| `failed`    | red      | solid     | red           |
| `error`     | red      | solid     | red           |
| `degraded`  | amber    | solid     | amber         |
| `beta`      | amber    | solid     | amber         |
| `draft`     | amber    | —         | amber         |
| `published` | emerald  | —         | emerald       |
| `high risk` | red      | —         | red           |
| `low risk`  | amber    | —         | amber         |

---

## Chat Panel

The chat panel is always present (never fully removed from the DOM unless `chatState === 'hidden'`).

### States

| State       | Width  | Description                           |
|-------------|--------|---------------------------------------|
| `expanded`  | 320px  | Full panel with message thread + input |
| `collapsed` | 40px   | Icon strip (chat icon + 3 shortcuts)   |
| `hidden`    | 0 / unmounted | Toggled via TopBar Assistant button |

### Message types

| Role        | Alignment | Style                                               |
|-------------|-----------|-----------------------------------------------------|
| `user`      | right     | `bg-[#1A1D24] border border-[#2A2F3A] rounded-xl`  |
| `assistant` | left      | No bubble — plain text with icon prefix             |

Action buttons in assistant responses: ghost style with `externalLink` icon, `text-[10px]`.

Context strip (below panel header): shows current nav section in monospace.

---

## Do's and Don'ts

### Do
- Use `font-mono` for all IDs, model names, version strings, tool names, commands, and timestamps
- Show `StatusDot` on every entity row and workspace header
- Keep section labels in ALL CAPS with `tracking-widest`
- Use `border-[#1E2129]` for all hairline dividers
- Use `Brackets` only on primary/active agent cards — not everywhere
- Keep the entity column visible during creation flows (don't replace it)
- Validate forms live, not on submit
- Use `transition-colors` not `transition-all`
- Use inline `style` prop only when a value is dynamic/computed (not for static design tokens)

### Don't
- Don't add a second accent color — cyan is the only interactive color
- Don't use `rounded-full` on cards or panels — only on dots and avatars
- Don't add glow shadows to generic list items or form fields
- Don't use `transition-all` on any element — it's too broad
- Don't use `border-white/*` or `border-gray-*` — use the defined border tokens
- Don't put `Brackets` on form inputs, rows, or modal dialogs
- Don't render animated rings outside of canvas agent node cards
- Don't use `!important` or arbitrary z-indices above `z-50`
- Don't add new status color values — map to the defined status semantics table
- Don't use lorem ipsum — use realistic technical placeholder data
- Don't use modal dialogs for entity creation — always use the creation workspace pattern

---

## File Reference

| File                  | Purpose                                               |
|-----------------------|-------------------------------------------------------|
| `src/index.css`       | Google Font imports, `@tailwindcss`, `@theme`, keyframes, canvas classes |
| `src/App.tsx`         | All components (currently colocated — extract as needed) |
| `src/DesignSystem.tsx`| Live visual reference page (open at `?ds=true`)       |
| `DESIGN_SYSTEM.md`    | This document                                         |
