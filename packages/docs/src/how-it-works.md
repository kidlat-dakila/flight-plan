---
title: How it works
description: How Flight Plan builds a review from the code, and how your agent explains it.
---

Flight Plan builds a review on its own, with no model, and you can read it as soon as it opens. Your agent explains it when you ask, writing through Flight Plan's MCP tools into the structure Flight Plan built. It can't add, remove or move anything in it.

## 1. Flight Plan builds the review

Open a pull request or a branch from the home page. If it has no review yet, Flight Plan builds one from git on the spot:

1. It reads the changed files and their diffs between the base and the head commit, and leaves out the files your [ignored files](/docs/setup/review-configuration/#advanced-options) match.
2. It follows the imports of each changed file in both directions, to the files that import it and the files it imports.
3. It finds each changed block of code and classifies it, such as a page, a component, an API route or a schema. It traces chains from what starts a path, such as a route, a page or an event handler, down to each changed block.
4. It splits the change into [segments](/docs/review-artifacts/parts/segments/): one for each path through the change, plus one for code that several paths share.
5. For each segment it builds the [Change Overview](/docs/review-artifacts/parts/change-overview/), the nodes and edges of the [Trace Diagram](/docs/review-artifacts/parts/trace-diagram/) and the [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/), and the files and waypoints of the [Code Walkthrough](/docs/review-artifacts/parts/code-walkthrough/), in the order you chose.
6. It marks the waypoints of the topics in your spotlight, and writes a short hint for each changed block, such as "Adds a component."

This runs on your machine, with tree-sitter. The review is ready to read. A part the agent hasn't explained shows Flight Plan's hint and says **Not explained yet**.

## 2. Your agent explains it

The first time a review opens, a dialog asks **Ask Claude to explain this review?**, with the name of your agent. It lists the parts your agent will write, from your [review configuration](/docs/setup/review-configuration/), and how many there are. **Explain** starts your agent, and **Not now** leaves the review as it is. **Explain this review** in the ⚙ menu opens the dialog again. You can also ask for one waypoint, one card or one file at a time. See [Explaining a review](/docs/review-artifacts/features/explaining/).

Flight Plan starts Claude in the repository's folder and asks it to explain the parts you picked with the Flight Plan review skill. With Codex or Cursor, Flight Plan copies a one-line prompt for you to run in your own session. Either way, the agent works through the same MCP tools:

| Tool | What the agent does with it |
|---|---|
| `get-instructions` | Reads how to write each part, for the prompt configuration you chose. |
| `read` | Reads the structure, the whole diff, or everything written so far. |
| `nodes` | Lists the waypoints, files and diagram nodes still to be written. |
| `update-nodes` | Writes the prose of a segment: its title and context, the diagram labels, the impact of each file, the explanation of each waypoint and the findings. It writes only the parts you asked for, and can't add, remove or move anything. |
| `complete` | Says the review is finished. Flight Plan checks it, and lists what is still missing if anything is. |
| `send-message`, `ask-questions` | Talks to you in the review's [chat](/docs/review-artifacts/features/agent-chat/). |
| `record-publication`, `record-import` | Records a review it [published or downloaded](/docs/review-artifacts/features/sharing/) as a Claude artifact. |

While it writes, a strip under the header shows who is writing and how many parts are done, such as **12 of 40 parts written**. Each part appears as soon as it's written, so you can read while the agent works.

## 3. The review is ready

When `complete` passes, the page that watched the agent write raises a browser notification, **Flight Plan Review ready**, if you allowed notifications.

## When the pull request moves

A review describes one commit. When you open a review whose pull request or branch has moved since, Flight Plan pulls the branch and builds the review again at the new commit. It keeps what your agent wrote for code that hasn't changed. What's new shows Flight Plan's hints until you ask your agent to explain it.

If Flight Plan can't pull the branch or build the review, or the agent is still writing it, the header says **Out of date**. See [Git features](/docs/review-artifacts/features/git-features/#keeping-a-review-up-to-date).
