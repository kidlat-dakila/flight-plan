---
title: Explaining a review
description: Ask your agent to explain a whole review or one part of it, and follow it while it writes.
---

Flight Plan builds a review without an agent. Your agent explains it: it writes the summaries, the labels, the explanations and the findings, for the parts you ask for.

## The whole review

The first time a review opens, a dialog asks **Ask Claude to explain this review?**, with the name of your agent. It sums up what your agent would do: the **Parts to explain**, the **Prompt configuration**, the **Code Walkthrough order**, whether **Segments** are on, and a **Total**, such as **5 parts to write and 12 waypoints to check**. The parts come from your [review configuration](/docs/setup/review-configuration/).

- **Explain** starts your agent.
- **Not now** closes the dialog, and the review doesn't ask again.
- **Configure** lets you change it for this review: tick the parts to explain, each with how much there is to write, and pick the prompt configuration, the Code Walkthrough order and whether to split the review into segments.

**Explain this review** in the ⚙ menu opens the dialog again at any time. Your agent writes only what is still missing.

## One part

You can also ask for one part when you get to it:

| Where | Button | Key | What your agent explains |
|---|---|---|---|
| A waypoint | **Let Claude explain** | G | That waypoint |
| A waypoint | **Explain the whole code block** | Ctrl+G | Every waypoint of the block of code it sits in |
| A card of the Trace Diagram | **Explain this card** | G | That card |
| A file of the Blast Diagram | **Assess this file** | G | What the change does to that file |

The buttons carry the name of your agent, and the keys work from the [Review Navigator](/docs/review-artifacts/features/review-navigator/). Ctrl+G is Control and G on every system, macOS included. When your agent is already writing, Flight Plan asks for the part next, once your agent finishes, if it's still missing then.

## While your agent writes

A strip under the header shows who is writing and how many parts are done, such as **Claude is writing the review** and **12 of 40 parts written**. A part on its way shows grey lines, and appears as soon as it's written. A waypoint's mark spins while your agent explains it.

If Claude stops before it's done, the strip says so. Send it a message in [Chat](/docs/review-artifacts/features/agent-chat/) to start it again.

## With Codex or Cursor

Flight Plan can start only Claude. With Codex or Cursor, **Explain** copies a one-line prompt. Run it in your agent's session. Until the first part arrives, the strip says **Waiting for your agent**, with **Copy the line** to copy it again. Asking for one part copies a prompt for that part.
