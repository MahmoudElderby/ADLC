Design the overall app shell and product UI system for an AI SDLC Command Center.

Product concept:
The product is an AI agent operations platform for software delivery teams. It lets users create, configure, run, monitor, and govern AI agents across the software development lifecycle.

The app should feel like a serious cybernetic engineering command center: precise, dark, technical, calm, slightly hacker-like, and trustworthy. It should not feel like a generic SaaS dashboard.

Primary design goal:
Create the main app structure, navigation behavior, and entity interaction model. Do not design every detailed screen. Focus on how the product is organized: left navigation, entity list, main workspace, and global chat panel.

Use this interaction model:
The app uses a sliced workspace pattern.

Far-left icon rail:
Create a narrow vertical navigation rail for the major product areas.

Include icons for:

Command Center

Agents

Workflows

Sessions

Approvals

Artifacts

Skills

MCP Servers

Environments

Traces

Settings

The rail should be compact, icon-driven, and cybernetic. The selected area should glow subtly in electric cyan. Use badges for important counts such as pending approvals or failed sessions.

Entity column:
When the user clicks a major area in the left rail, open a second column beside it showing entities for that area.

Examples:

Clicking Sessions shows a Sessions entity list.

Clicking Agents shows an Agents entity list.

Clicking Workflows shows a Workflows entity list.

Clicking MCP Servers shows an MCP Servers entity list.

Clicking Skills shows a Skills entity list.

The entity column should include:

Section title

Search/filter input

Primary add button

Optional secondary actions menu

List of entities

Status indicators

Timestamps or last-run metadata

Small count or health badges where relevant

Examples:
For Sessions:

Add / start new session button

Active, failed, waiting approval, completed status markers

Session title

Agent name

Runtime

Last event time

For Agents:

Create agent button

Agent name

Model

Published/draft status

Attached MCP/skills count

Last run state

For Workflows:

Create workflow button

Workflow name

Active run count

Last run result

Approval policy indicator

This entity column should behave like an object browser. Selecting an item updates the main workspace.

Main workspace:
The main workspace shows the selected entity or selected product area.

The main workspace changes depending on what is selected:

Command Center shows the live active agent fleet canvas.

A Session shows session execution details.

An Agent shows agent configuration and run history.

A Workflow shows the workflow canvas and selected step details.

An MCP Server shows connection config, allowed tools, status, and usage.

A Skill shows skill details, versions, compatibility, and usage.

An Environment shows sandbox/runtime configuration and risk settings.

Approvals shows approval details and decision history.

Traces shows execution timeline and raw event details.

The main workspace should use tabs where useful. Example session tabs:

Trace

Output

Config

Example agent tabs:

Overview

Configuration

Capabilities

Sessions

Versions

Example workflow tabs:

Canvas

Runs

Config

Approvals

Use a header at the top of the main workspace showing:

selected entity name

status indicator

short ID chip

important runtime metadata

primary action buttons such as Run, Stop, Replay, Publish, Save, or Clone depending on context

Global Platform Chat panel:
Create a right-side Platform Chat panel that exists across the entire app.

It should:

Be visible on all screens.

Support collapsed and expanded states.

When expanded, the main workspace should resize/adapt instead of being covered.

Understand the current selected screen/entity context.

Let the user ask operational questions such as:

“What is running right now?”

“Why is this session blocked?”

“Which agents use this MCP server?”

“Show failed runs from today.”

“Summarize this workflow run.”

“Start a new SRE incident workflow.”

Include command-style action buttons in assistant responses:

Open session

Open approval

Open trace

Start run

View config

Retry failed run

The chat should feel like a platform command assistant, not a casual chatbot.

Command Center behavior:
When Command Center is selected in the far-left rail:

The entity column can show a compact live overview or be minimized.

The main workspace should focus on active running main agents only.

Show active main agents, their subagents, and approval-needed states.

Do not show idle agents, completed sessions, historical lists, recent artifacts, or recent event streams on the Command Center main canvas.

Metric tiles should navigate to their respective screens or filtered lists.

Click behavior:
Define clear click interactions:

Clicking a far-left nav icon changes the entity column.

Clicking an entity in the entity column opens it in the main workspace.

Clicking the add button in the entity column creates a new entity for that section.

Clicking a metric tile navigates to the relevant section or filtered view.

Clicking an active agent in the Command Center opens its session.

Clicking a subagent opens its trace/details.

Clicking an approval indicator opens the approval detail.

Clicking a chat action button navigates or executes the suggested action after confirmation if needed.

Visual direction:
Use a calm cybernetic command center style:

Near-black graphite background

Layered charcoal panels

Electric cyan primary accent

Acid green for live/running/healthy states only

Amber for approvals and waiting states

Red for failed/risky states only

Soft white primary text

Muted blue-gray secondary text

Thin dividers

Subtle glow

Dense but readable spacing

Monospace for IDs, event names, commands, and technical metadata

Clean technical typography for normal UI labels

Interaction feel:
The UI should feel fast, serious, and operational.
Use precise selection states, slim panels, compact metadata, clear status dots, and subtle motion cues.
The product should feel like an AI engineering cockpit where every visible object is clickable and meaningful.

Avoid:

Generic SaaS dashboard cards

Marketing landing page composition

Cartoon robots

Fake hacker stereotypes

Decorative code rain

Giant sci-fi orbs

Excessive neon

Decorative charts with no operational value

Overly spacious enterprise UI

Modal-heavy workflows for core navigation

Overall feeling:
A sliced, highly operational AI command center. The user can move from product area, to entity list, to entity detail, while keeping a global platform chat assistant available on the right at all times.