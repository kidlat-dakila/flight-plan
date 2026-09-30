# Flight Plan

Read a pull request the way its author would explain it, instead of as a list of
files.

A Flight Plan walkthrough is ordered prose beside the code it is about. Waypoints
scroll on one side; the code panel follows on the other, showing the file with
the relevant lines focused. The code is **referenced, never pasted**: a waypoint
names a path and a line range, and the file is read when you open it, at the
commit the walkthrough was written against.

Your assistant writes the walkthrough through Flight Plan's MCP tools. You read
it in a VS Code panel.

## What it does

- **Walkthroughs** for a pull request or a branch: context, an overview, a
  diagram of the path the change runs through, a blast radius of what it
  affects, and a code walkthrough grouped by file, with findings (risks,
  questions, fixes).
- **Plans**: proposed code, spliced into the files it would change, before any
  of it is written.
- **Diff marks, coverage and staleness**: the lines the change added are marked,
  a bar says how many changed files the walkthrough covers, and a notice says
  when the pull request has moved past the commit the walkthrough describes.
- **Reviewed marks**: mark a waypoint or a file as reviewed and it hides. It
  comes back when its content changes.
- **Live while it is written**: the panel opens on the first part and fills in
  as the assistant writes. When the assistant finishes, VS Code says so, with a
  button that opens it.
- **A review list** in the Source Control view: the pull requests you were asked
  to review and the ones you opened, marked by whether a walkthrough exists.
- **Your editor theme** in the panel and in the code.

## Getting started

Setup opens by itself the first time the extension runs. It installs the tools,
starts the server they run on, and connects your agent. Reopen it any time with
**Flight Plan: Open Setup**.

Out of the box Flight Plan uses plain `git`: it reads files, commits and diffs
from your checkout, and needs no CLI, no token and no network.

To list pull requests or filter by review state, choose how to reach your code
host in Setup:

- **[GitHub CLI](https://cli.github.com)**, if it is signed in. There is no
  token to store.
- **GitHub**, **GitLab** or **Bitbucket Cloud** with a personal access token.
  Self-hosted GitHub Enterprise and GitLab instances take a base URL.

Setup says how to get each one and which scopes it needs. Flight Plan reads as
you, so it sees what you can see.

## Writing a walkthrough

Ask Claude Code for `/flightplan:review` on a pull request you are reviewing.
Setup installs that skill as a Claude Code plugin, and registers the MCP server
for Claude Code. It gives a snippet for Codex, Cursor and other agents.

The server has ten tools: `start`, `read`, `nodes`, `update-document`,
`update-nodes` and `complete` write a walkthrough or a plan piece by piece;
`update-plan` writes a whole plan; `list-plans` and `open-plan` find one;
`get-instructions` serves the writing instructions. Plans have no skill: ask
your assistant for a plan and name the Flight Plan tools.

A document is JSON. The assistant sends it through the tools and never learns
where it is stored. `start` does not replace an existing walkthrough unless it
is told to reset it, so edits you made by hand are not lost by accident.

## Commands

- **Flight Plan: Open Setup**: the guided setup view.
- **Flight Plan: Open Settings**.
- **Flight Plan: Open Pull Request Walkthrough** and **Flight Plan: Open Plan**:
  also on the rows of the review list and the plan list.
- **Flight Plan: Copy Prompt to Update This Walkthrough**, **… Write It Again
  From Scratch**, **Copy Annotation Path for This Document**: on the panel's
  title bar.
- **Flight Plan: Remove Agent Tooling**.

## Privacy and security

The server runs while VS Code is open and listens on `127.0.0.1` only. Its HTTP
API has no authentication and answers any origin, so a web page open in your
browser while the server runs can read your stored walkthroughs and the files
of the checkouts Flight Plan knows. Your code host credential stays in the VS
Code keychain and in the server's memory; it is never written to disk.

The server keeps a log beside itself, which **Flight Plan: Open Server Log**
opens: server starts and crashes, tool calls, scaffold steps and failures, and
API writes and errors. It names repositories, documents and error messages. It
never holds a credential, the server's token, or document or file text. It is
capped at two files of 5 MB.

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the backend on `http://localhost:3000` (tRPC at `/api/trpc`, MCP at
`POST /mcp`) and the frontend on `http://localhost:4200`, which proxies `/api` to the
backend.

Checks, run through Nx:

```bash
nx run-many -t eslint:lint typecheck test -p <projects>
nx affected -t eslint:lint typecheck test
nx build <project>
```

Layout: `apps/backend` (Fastify server), `apps/frontend` (React app),
`packages/ui` (shared components).
`src/` holds the legacy extension code, kept only as a reference for porting: no
build, lint, type-check or test runs over it. The VS Code extension that used to
live in `src/vscode` is kept, unmaintained, in the separate `vscode-flight-plan` folder.
