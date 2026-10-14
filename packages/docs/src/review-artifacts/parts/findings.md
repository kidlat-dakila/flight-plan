---
title: Findings
description: The bugs, risks, nits and questions the agent reports on the code it explains.
---

A finding is something the agent thinks you should know about a piece of code. It sits on the waypoint it is about, inside the Code Walkthrough.

## Kinds

From most to least severe:

| Kind | Meaning |
|---|---|
| **Bug** | Broken behaviour the agent can show. |
| **Risk** | Fragile code, or code that looks broken but isn't proven to be. |
| **Nit** | An optional improvement. |
| **Question** | Something the agent genuinely wants to ask. |

A waypoint's chip shows its most severe finding, so you can spot them while you scroll. The walkthrough's **Filter** shows only the waypoints with a kind you pick.

## What a finding holds

- A **title** and a **reading** that explains it.
- A **Trace**: numbered steps, each linked to the code, starting from what triggers the problem.
- A **fix**, for bugs, risks and nits. **Preview the fix** shows it as a diff of the waypoint's lines.

A question has no trace and no fix.

Findings are written by the agent. Under the Minimal configuration they are off, and a **Generate** button lets you ask for them.
