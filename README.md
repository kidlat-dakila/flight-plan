# Flight Plan

An offline-first code review tool that helps you understand and navigate the changes in a pull request.

Flight Plan reads the code of a pull request, or of a branch with no pull request, and lays the change out as a guided
review in a local web app, next to the code it describes. It shows how the change runs, what it can affect, and where to
look. It works from your local git checkout, and connects to GitHub, GitLab or Bitbucket for their pull requests,
comments and reviews.

Flight Plan builds the review from the code itself, with no model involved. It reads the syntax trees to work out who
calls what, then draws the diagrams and lays out the walkthrough from them. A coding agent can fill in the prose through
Flight Plan's MCP tools: why the change exists, the labels, the explanations and the findings. It writes only that
prose, so it cannot leave a caller out or invent one.

## Running it

```bash
npx @kidlat-dakila/flightplan
```

You can also install it once with `npm install -g @kidlat-dakila/flightplan` and then run `flightplan`. The command
starts one local server for the web app, the API and the MCP endpoint, and opens it in the browser at
`http://localhost:24747`.

- If Flight Plan is already running, it only opens the browser.
- If another program holds the port, Flight Plan takes a free one, keeps it for the next runs and points your agents
  at it.
- `--port <number>` sets the port. If that port is taken, Flight Plan stops and says so.
- `--no-open` leaves the browser closed. `--version` and `--help` print the version and the usage.

Flight Plan needs Node.js 22 or later.

## Setup

The first run opens setup, which has four steps:

1. **Agents**: pick the coding agents you use (Claude Code, Codex, Cursor). Flight Plan installs its review skill, its
   plugin and its MCP server into the folder of each one.
2. **Forges**: pick how Flight Plan reaches your pull requests, and choose the default.
   - Plain `git` reads your checkout and needs no CLI, token or network. It reviews branches, but it cannot list pull
     requests or show reviewers.
   - The **GitHub CLI** (`gh`) and the **GitLab CLI** (`glab`) use their own sign-in.
   - **GitHub**, **GitLab** and **Bitbucket** use a token. GitHub Enterprise, self-managed GitLab and Bitbucket Data
     Center take a base URL.
3. **Repositories**: add the repositories to review, and the people whose pull requests you follow in each one.
4. **Configuration**: choose how the agent writes (see [Configurations](#configurations)).

You can change all of these later in **Settings**. Flight Plan acts on your forge as you, so it sees what you can see.

## Reviewing a pull request

1. Open a repository on the homepage, then pick a pull request or a branch.
2. Make a review request: choose the configuration, the order of the Code Walkthrough and the agent. Flight Plan can
   start Claude Code for you. With any other agent, copy the prompt it gives you into your own agent session.
3. Flight Plan builds the review from the change, and the page opens it at once, ready to read. The prose of each part
   fills in as the agent writes it, and the page shows how much is written.
4. When the agent finishes, the browser notifies you.

A review artifact has these parts:

- **Context**: why the change exists, in a few sentences to read before any code.
- **Journey Flow Diagram**: how execution reaches the changed code, from whatever starts it.
- **Blast Diagram**: the files connected to the change through imports, and what the change does to the ones it did
  not touch.
- **Code Walkthrough**: the changed code, one file at a time, with each explanation on the lines it is about and
  findings (risks, questions, fixes) on the code they concern. It states how many of the changed files it covers.

While you read:

- **Reviewed marks** hide a waypoint or a file until its content changes.
- **Staleness**: the page says so when the pull request moves past the commit the review describes. **Update the Flight
  Plan** rebuilds the review at the latest commit and keeps what was written for unchanged code. **Regenerate from
  scratch** keeps nothing.
- **Comments**: comment on a line or a range, reply to threads, resolve them, and submit a review with a verdict. All
  of it goes to the forge.
- **Chat**: talk to the agent that wrote the review. Select code and choose "Ask the agent" to ask about it. The agent
  can ask you questions, and when Flight Plan started the agent, it asks your permission for tools here. Code links in
  its messages open the code.

The codegraph reads TypeScript, JavaScript and JSX, Python and Vue.

## Your own pull requests

A branch with no pull request, or a pull request you wrote, opens on the author's page. There you write the Flight
Plan yourself or start from an agent draft, and edit its segments, contexts, diagrams and walkthrough. When it is
complete you can share it:

- **In the pull request description.**
- **As a Claude artifact**: one page with the whole review and the code it shows, which anyone can read without Flight
  Plan or the repository. A Claude Code session uploads it. Readers can bring it into their own Flight Plan with
  **Download to Flight Plan**.

A Flight Plan written for a branch moves to the branch's pull request when you mark it as complete.

## Configurations

A configuration decides how the agent writes: the voice of its prose, how each field is worded, and which sections it
writes. The structure of a review never changes with the configuration.

| Preset | Written for |
|---|---|
| **Standard** | A reviewer who knows the codebase and wants the full review. The default. |
| **Minimal** | The shortest review that still answers its questions. No diagrams and no findings. |
| **Onboardee** | A reader new to the codebase. It describes the code around the change. |
| **Unfamiliar territory** | A reviewer who does not know the language or the libraries. It also describes each library and language name in the code shown. |

Under **Settings → Configurations** you can duplicate a preset, edit its instructions one field at a time, and switch
sections on or off.

## Agent tools

The MCP endpoint is at `/mcp` on the server's address. Its tools are:

| Tool | What it does |
|---|---|
| `get-instructions` | Returns how to write each field, for the configuration the reviewer chose |
| `read`, `nodes` | Read the review artifact, and list the parts still to be written |
| `update-nodes` | Write the prose of the parts |
| `complete` | Mark the review artifact complete, after the checks a finished one must pass |
| `send-message`, `ask-questions` | Send the reviewer a message, or ask one question or a batch |
| `record-publication`, `record-import` | Record a Flight Plan published to a Claude artifact, or one fetched from it |

Agents write only prose. They cannot change which nodes, files or lines a review covers.

## Privacy

All data stays on your machine, in `~/.flightplan/`. Set `FLIGHT_PLAN_DATA_DIR` to use another directory. Nothing is
written into the repositories you review. Nothing is sent anywhere except to your forge, when you comment or submit a
review, and to a Claude artifact, when you publish one.

The server listens on `localhost` and has no sign-in, so any program on your machine can reach it while it runs.

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the backend on `http://localhost:3000` (tRPC at `/api/trpc`, MCP at `POST /mcp`) and the frontend on
`http://localhost:4200`, which proxies `/api` to the backend.

`pnpm install` also installs a pre-commit hook (husky) that runs ESLint and type-checking for the projects a commit
touches.

`pnpm build:prod` builds the production bundle and puts together the npm package in `dist/package`. `pnpm start` runs
that build the way the `flightplan` command does, without building it first.

To release, bump the version and push its tag from an up-to-date `main`:

```bash
npm version patch -m "chore: release %s"
git push --follow-tags
```

The tag starts the [Release workflow](.github/workflows/release.yml). It checks that the tag is on `main` and matches
`package.json`, runs lint, type-checking and tests, builds the package and stages it on npm through trusted publishing.
The version goes live once a maintainer approves it with two-factor authentication, under Staged Packages on npmjs.com
or with `npm stage approve <stage-id>`.

Run checks through Nx:

```bash
nx run-many -t eslint:lint typecheck test -p <projects>
nx affected -t eslint:lint typecheck test
nx build <project>
```

| Folder | Content |
|---|---|
| `apps/backend` | The Fastify server: the tRPC API, the MCP endpoint, and the `flightplan` command |
| `apps/frontend` | The React web app |
| `packages/ui` | Shared components |
| `packages/configurations` | The shape of a review artifact, its field instructions and the presets |
| `packages/codegraph` | Traces a change through the code and builds the diagrams and the Code Walkthrough |
| `packages/git-forge` | The adapters for plain git, GitHub, GitLab and Bitbucket |
| `plugin` | The Claude Code plugin with the review skill |
| `tools/npm-package` | Puts together the npm package |
| `tools/playground-fixtures` | The codegraph's end-to-end cases |

[AGENTS.md](AGENTS.md) holds the rules for working in this repository, and [docs/vocabulary](docs/vocabulary/README.md)
defines the terms Flight Plan uses.

## License

Flight Plan is licensed under the [Functional Source License, Version 1.1, ALv2 Future License](LICENSE.md)
(FSL-1.1-ALv2). You may use, change and share it for any purpose except offering it, or something built from it, as
a commercial product or service that competes with Flight Plan. Two years after each version is released, that version
is also available under the Apache License, Version 2.0.
