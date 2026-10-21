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

Flight Plan can start Claude for you. It runs Claude as an interactive session in a terminal in the background, in the repository's folder, so it runs on your subscription. It avoids headless commands such as `claude -p`, which can be billed separately from a subscription.

Flight Plan can't start Codex or Cursor. When you ask one of them to explain a review, Flight Plan copies a one-line prompt for you to run in your own session.

**How does Flight Plan interact with the agent?**, under the list of agents, says the same in short.

## What gets installed

- **Claude:** a plugin named `flightplan`, from a plugin marketplace Flight Plan writes to `~/.flightplan/agent-plugin/`. The plugin holds the review skill and the MCP server.
- **Codex:** the skill in `skills/flightplan-review/`, and a `flightplan` entry under `mcp_servers` in `config.toml`.
- **Cursor:** the skill in `skills/flightplan-review/`, and a `flightplan` entry under `mcpServers` in `mcp.json`.

Every MCP entry points at `http://localhost:<port>/mcp`. Flight Plan installs again each time you save **Settings → Agent integration**, and each time it starts on a new port, so your agents always reach the running server.
