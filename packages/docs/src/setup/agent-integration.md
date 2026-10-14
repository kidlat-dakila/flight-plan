---
title: Agent integration
description: Pick the coding agents that write your reviews, and how Flight Plan works with them.
---

A coding agent writes each review. In this step you pick every agent you use, and Flight Plan installs its review skill and its MCP server into each one.

![Picking Claude as the agent, with its install folder, model and effort](../../media/setup-agents-light.webm)

## Pick your agents

Flight Plan works with three agents:

| Agent | Command it looks for | Folder it installs into |
|---|---|---|
| Claude | `claude` | `$CLAUDE_CONFIG_DIR`, or `~/.claude` |
| Codex | `codex` | `$CODEX_HOME`, or `~/.codex` |
| Cursor | `cursor-agent` | `~/.cursor` |

An agent whose command is not on your `PATH` or in `~/.local/bin` shows as **Unavailable** and can't be picked. Install it, then reload the page.

For each agent you check:

- **Install folder** is where the agent keeps its configuration. Flight Plan fills it in when it finds the folder. **Browse** lets you pick another one. Flight Plan checks that the folder looks like the agent's own, for example that a Claude folder holds `settings.json` or `history.jsonl`.
- **Model** is the model the agent writes with. When the agent can't list its models, the only choice is the agent's own default.
- **Effort** appears for models that offer one: Default, Low, Medium, High, Extra high or Max.
- **Default** marks the agent a new review starts with. With one agent picked, it is the default.

## How Flight Plan works with your agent

- **Automatic** (recommended). Flight Plan starts your agent's command line program and sends it each request. It doesn't use the agent's SDK, so you pay nothing beyond your normal use.
- **Manual.** Flight Plan gives you each prompt, and you paste it into your own agent session. In manual mode you can't chat with the agent from a review or apply a fix from a finding.

Today Flight Plan can start Claude only. With Codex or Cursor, you paste the prompt yourself even in automatic mode.

## What gets installed

- **Claude:** a plugin named `flightplan`, from a plugin marketplace Flight Plan writes to `~/.flightplan/agent-plugin/`. The plugin holds the review skill and the MCP server.
- **Codex:** the skill in `skills/flightplan-review/`, and a `flightplan` entry under `mcp_servers` in `config.toml`.
- **Cursor:** the skill, and a `flightplan` entry under `mcpServers` in `mcp.json`.

Every MCP entry points at `http://localhost:<port>/mcp`. Flight Plan installs again each time you save this section in Settings, and each time it starts on a new port, so your agents always reach the running server.
