---
title: Agent integration
description: Pick the coding agent that explains your reviews, and where Flight Plan installs into it.
---

Flight Plan builds each review from the code on its own. What it can't do alone is explain each part of the change and find potential bugs. That's what your agent adds: it writes the summaries, the labels, the explanations and the findings, and answers your questions in Chat. In this step you pick your agent, and Flight Plan installs its review skill and its MCP server into it.

![Checking Codex in Settings → Agent integration, then picking Opus and the High effort for Claude](../../media/setup-agents-light.webm)

## Pick your agent

Flight Plan works with three agents:

| Agent | Command it looks for | Folder it installs into |
|---|---|---|
| Claude | `claude` | `$CLAUDE_CONFIG_DIR`, or `~/.claude` |
| Codex | `codex` | `$CODEX_HOME`, or `~/.codex` |
| Cursor | `cursor-agent` | `~/.cursor` |

An agent whose command isn't on your `PATH` or in `~/.local/bin` shows as **Unavailable** and can't be picked. Install it, then reload the page. Pick at least one.

For each agent you check:

- **Install folder** is where the agent keeps its configuration. Flight Plan fills it in when it finds the folder, and **Browse** lets you pick another one. Flight Plan checks that the folder looks like the agent's own, for example that a Claude folder holds `settings.json` or `history.jsonl`.
- **Model** is the model the agent writes with. When the agent can't list its models, the only choice is the agent's own default.
- **Effort** appears for models that offer one: Default, Low, Medium, High, Extra high or Max.
- **Default** marks the agent that explains your reviews when you pick more than one.

## How Flight Plan works with your agent

Your agent runs in a terminal you can see, never in the background. In Claude, `/flightplan:live <repository>/<target>` keeps the session working on one review, for example `/flightplan:live storefront/pr-412`. It waits for the parts you ask it to explain and for your messages in Chat, and does each one. Leave the terminal open while you review. Closing it takes the agent offline. When you leave the review's tab for 10 minutes, Flight Plan ends the session and closes the terminal it opened. When you come back, it asks you to start the agent again.

When the agent is offline and a review needs it, Flight Plan asks you to start it. On macOS, **Open a terminal for me** opens Terminal in the repository's folder and starts Claude there with the command. You can also copy the command and run it in a Claude session you started yourself. Claude runs as an interactive session, so it runs on your subscription.

The top bar of a review shows whether your agent is online, such as **Claude online**.

The live command works only in Claude for now. With Codex or Cursor, Flight Plan copies a one-line prompt for you to run in your own session.

**How does Flight Plan interact with the agent?**, under the list of agents, says the same in short.

## What gets installed

- **Claude:** a plugin named `flightplan`, from a plugin marketplace Flight Plan writes to `~/.flightplan/agent-plugin/`. The plugin holds the review skill, the live skill and the MCP server.
- **Codex:** the skill in `skills/flightplan-review/`, and a `flightplan` entry under `mcp_servers` in `config.toml`.
- **Cursor:** the skill in `skills/flightplan-review/`, and a `flightplan` entry under `mcpServers` in `mcp.json`.

Every MCP entry points at `http://localhost:<port>/mcp`. Flight Plan installs again each time you save **Settings → Agent integration**. Each time it starts, it also checks your agents and installs again any that has older skills or points at another port, so your agents always have the latest skills and reach the running server. A new Claude session picks up the update.
