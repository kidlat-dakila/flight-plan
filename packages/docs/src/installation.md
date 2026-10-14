---
title: Installation
description: Run Flight Plan from the command line and open it in the browser.
---

Run Flight Plan with `npx`:

```bash
npx @kidlat-dakila/flightplan
```

To install it once, run `npm install -g @kidlat-dakila/flightplan`. After that, start it with `flightplan`.

The command starts one server on your machine. It serves the web app, its API and the MCP endpoint your agent writes through, and opens the app at `http://localhost:24747`. The first time, the app takes you through [setup](/docs/setup/).

## What you need

- Node.js 22 or later.
- `git` on your `PATH`. Flight Plan reads diffs, branches and remotes with it.
- At least one coding agent: Claude Code (`claude`), Codex (`codex`) or Cursor (`cursor-agent`). Setup only offers an agent whose command it finds on your `PATH` or in `~/.local/bin`.
- A way to reach your pull requests. Local git needs nothing. The GitHub and GitLab command line tools need to be signed in (`gh auth login`, `glab auth login`). A token connection needs your system keychain: Keychain on macOS, Credential Manager on Windows, or Secret Service on Linux.

## Options

```text
Usage: flightplan [options]

Options:
  --port <number>  Listen on this port instead of 24747
  --no-open        Do not open the browser
  -v, --version    Print the version
  -h, --help       Print this help
```

- If Flight Plan is already running, the command only opens the browser.
- If another program is using port 24747, Flight Plan picks a free port, uses it again on later runs, and points your agents at it.
- If you name a port with `--port` and it is taken, Flight Plan stops and tells you.
- The `PORT` and `HOST` environment variables set the port and the host as well. `--port` takes precedence over `PORT`.

## Where your data lives

Flight Plan keeps everything in `~/.flightplan/`: your settings, your reviews and the plugin it installs for Claude. Set `FLIGHT_PLAN_DATA_DIR` to use another folder. Nothing is written into the repositories you review.

Forge tokens are not stored in that folder. They go into your system keychain, and Flight Plan never shows them again.

Flight Plan sends data out in two cases only: to your forge when you comment or submit a review, and to a Claude artifact when you publish a review.
