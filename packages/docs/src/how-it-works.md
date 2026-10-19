---
title: How it works
description: How Flight Plan builds a review artifact from the code, and how your agent writes its prose.
---

A review artifact is built in two passes. Flight Plan builds its structure from the code, with no model involved, and the review is ready to read. Then your agent writes the prose into that structure through Flight Plan's MCP tools. The agent can't add, remove or move anything in it.

## 1. You start the review

Open a pull request or a branch that has no review yet. The page shows **No Flight Plan Review yet** and a form with three choices:

- **Configuration.** How the agent writes: its voice, its wording and the sections it writes. The default comes first. See [Preset profiles and customizing](/docs/presets/).
- **Order of the Code Walkthrough.** The order the agent puts the changed files in: **Foundations first** (the default), **Along the path**, **Core change first**, **Risk first**, or **Custom** with your own instruction. Every changed file is covered whichever you choose.
- **Agent.** The agent that writes the review, with its model and effort. **I will prompt my agent myself** copies a prompt for you to paste into your own agent session instead.

**Start the review** starts the agent. **Copy the prompt** copies it.

## 2. Flight Plan builds the structure

Before any agent starts, Flight Plan reads the change from git and builds the whole skeleton of the review:

1. It reads the changed files and their diffs between the base and the head commit.
2. It follows the imports of each changed file in both directions, to the files that import it and the files it imports.
3. It joins changed files that share imports, and finds each changed block of code. It traces chains from what starts a path, such as a route, a page or an event handler, down to each changed block.
4. It splits the change into [segments](/docs/review-artifacts/parts/segments/): one for each path through the change, plus one for code that several paths share.
5. For each segment it builds the nodes and edges of the [Journey Flow Diagram](/docs/review-artifacts/parts/journey-flow-diagram/) and the [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/), and the files and waypoints of the [Code Walkthrough](/docs/review-artifacts/parts/code-walkthrough/).

This runs on your machine, with tree-sitter. The page opens the review at once: the diagrams and the walkthrough are there to read, and each piece of prose is marked **Not written yet.**

## 3. Your agent writes the prose

Flight Plan starts Claude in the repository folder and asks it to review the target with the Flight Plan review skill. With Codex or Cursor, or in manual mode, you paste the prompt into your own session. Either way the agent works through the same MCP tools:

| Tool | What the agent does with it |
|---|---|
| `get-instructions` | Reads how to write each field, for the configuration you chose. |
| `read` | Reads the skeleton, the whole diff, or everything written so far. |
| `nodes` | Lists the waypoints, files and diagram nodes still to be written. |
| `update-nodes` | Writes the prose of a segment: its title and context, the diagram labels, the impact of each file, the waypoint readings and the findings. It can't add, remove or move anything. |
| `complete` | Says the review is finished. Flight Plan checks it, and lists what is still missing if anything is. |
| `send-message`, `ask-questions` | Talks to you in the review's [chat](/docs/review-artifacts/features/agent-chat/). |

While it writes, the review page shows who is writing and how many parts are done, such as **12 of 40 parts written**. Each part appears as soon as it is written, so you can read while the agent works.

## 4. The review is ready

When `complete` passes, the review is marked complete. The page that watched it raises a browser notification, **Flight Plan Review ready**, if you allowed notifications.

## When the pull request moves

A review describes one commit. When the pull request moves past it, the header says **Out of date**. Two actions in the review's options menu build the review again from the latest commit:

- **Update the Flight Plan** keeps what the agent wrote for code that hasn't changed, and the agent writes the rest.
- **Regenerate from scratch** erases everything the agent wrote, and the agent writes all of it again.

Both pull the branch first. Choosing a different configuration in an update is a full rewrite.

## Sections that are off

A configuration can leave a section out, such as the Journey Flow Diagram or the findings. The review then shows a **Generate** button in its place, and the agent writes that section when you ask for it.
