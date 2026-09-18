# Demo Script: Cockpit Shell and the Capability Registry, For Real

Required by Constitution v1.1.0, Principle VI. Written at specification time. A
reviewer must be able to follow this successfully before the feature is accepted.

## Before you start

- The platform and its durable storage are running.
- The workspace's operator account credentials are available.
- The workspace's execution environment is running and has a network route to the
  MCP server used below.
- An MCP server address reachable **only** from the execution environment's
  private network, plus its credential, are available.
- The workspace has no registered skills or MCP servers yet.

Nothing in this script may be performed against intercepted requests or
substituted storage.

## Part 1 — Enter the cockpit as a known user

| Step | Action | What the reviewer must observe |
|---|---|---|
| 1 | Open the application while signed out | Access is refused and sign-in is offered. No workspace content is visible. |
| 2 | Copy a deep link to a capability creation view and open it while signed out | Refused the same way. Nothing about the workspace leaks. |
| 3 | Sign in with the operator account | The cockpit loads with the top bar, navigation rail, entity column, main workspace, and assistant panel all present, and the signed-in identity and workspace are shown. |
| 4 | Read the navigation rail | Only areas with working screens are listed. There is no navigation target that leads nowhere. |
| 5 | Move between the available areas | The entity column and main workspace both change. The assistant panel stays put. |
| 6 | Collapse the assistant panel, then hide it | The main workspace grows to reclaim the space. The panel never covers workspace content. |
| 7 | Reload the page | The same area and the panel state are restored. |
| 8 | Sign out, then reopen the last link | Refused until signed in again. |

## Part 2 — Register a skill that is still there tomorrow

| Step | Action | What the reviewer must observe |
|---|---|---|
| 9 | Open the Capability Registry and start creating a skill from the entity column | A creation workspace opens in the main workspace area. The entity column and assistant panel remain visible. No modal dialog appears. |
| 10 | Leave a required field empty and try to save | Saving is refused with a message naming the specific problem. |
| 11 | Fill the skill in, watching the panel as you type | Validation updates live, blocking errors are visually distinct from warnings, and the configuration preview tracks the form. |
| 12 | Save the skill | It appears in the entity column with its status. |
| 13 | Open the skill and look at its history | It shows that the operator account registered it, and when. |
| 14 | Edit the skill and save | The change applies and a second history entry appears. The first entry is unchanged. |
| 15 | **Restart the platform**, sign in, and reopen the skill | The skill, its edit, and both history entries are exactly as they were, still attributed to the operator account. |

Step 15 is the step that spec 001 could not have passed.

## Part 3 — Register an MCP server without handling its secret

| Step | Action | What the reviewer must observe |
|---|---|---|
| 16 | Register the private-network MCP server with its label, address, allowed tools, connection origin, required flag, and credential reference | It is saved and its reachability resolves to reachable — proving the check ran from the execution environment, since the platform service alone could not reach it. |
| 17 | Look for the credential anywhere in the interface | Only the reference and its health appear. The value appears nowhere. |
| 18 | Inspect the browser's network responses for this screen | No credential value in any response. |
| 19 | Inspect the stored record directly | The credential is not readable in plain text. |
| 20 | Register a second MCP server reusing the first one's label | Refused, with the conflict identified. |
| 21 | Register an MCP server at an unreachable address | Saved and reported unhealthy with an actionable reason. The record is not discarded. |
| 22 | **Stop the execution environment**, then register another MCP server | Saved with reachability reported as **unverified**, with the reason shown — not guessed as healthy or unhealthy. |
| 23 | Restart the execution environment and revalidate that server | Reachability resolves. |
| 24 | Attempt to remove a capability that a published agent references | Refused, and the referencing agents are named. |

## Acceptance signal

The reviewer completed all 24 steps against the real interface, the real service,
and real durable storage, and can answer for every capability created: who
registered it, when, whether it is reachable, and where its secret is — without
ever having seen the secret.
