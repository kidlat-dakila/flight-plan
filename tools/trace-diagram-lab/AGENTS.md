# tools/trace-diagram-lab

One page that renders the Trace Band exactly as the app renders it, for every fixture of `tools/playground-fixtures` and of the lab's own cases, so a change to the codegraph or the UI that breaks the Trace Diagram in one repository or changeset shows up before it ships. The page draws one fixture at a time, full screen with its side panel, with a select listing every fixture and previous and next buttons. `tools/trace-diagram-lab-e2e` takes a screenshot of every fixture. To add or change a lab case, use the commands under [Creating or updating a trace fixture](#creating-or-updating-a-trace-fixture).

## Creating or updating a trace fixture

A kind is one folder of `cases/` with its repository and every case in it. A trace fixture is the trimmed snapshot of one case. Each job has a project command in `.claude/commands/repo/`, and the command is how the job is done:

| Command | Job |
|---|---|
| `/repo:trace-fixture:create <kind> <the change>` | One new case, in a kind that exists or a new one: the scaffolding first (the kind, the `it`, the generated snapshot, checked), then the written parts the Trace Diagram shows |
| `/repo:trace-fixture:update <kind>/<snapshot> <what changes>` | One case that exists: its snapshot and code-blocks file are deleted, generated from scratch and its written parts written again |

A playground fixture is changed with the playground's own commands, listed in [tools/playground-fixtures/AGENTS.md](../playground-fixtures/AGENTS.md). The lab reads it as it is.

## Rules

- **The band is built by codegraph, never in the lab.** `buildTracePage` of `@flightplan/codegraph` turns a `ReviewArtifact` into the Trace Band's props through the same steps as the backend's review page: `prepareReviewView`, then `buildSegmentTrace` and the segment heading for each segment. The page renders `TraceBand` of `@flightplan/ui` with what it returns. Nothing the band shows is derived, filtered or formatted in the lab, so what the lab draws is what the app draws.
- **`src/fixtures/` and `src/server/` run in Node only.** They read the fixtures from disk, build each page through `buildTracePage`, and serve them at `GET /api/trace-fixtures`. The browser code, `src/app/` and `src/main.tsx`, never imports them: it fetches what the server sends, and lint rejects an import of `src/fixtures/` from it.
- **The lab reads every playground fixture as it is.** `src/fixtures/index.ts` lists and reads them through `@flightplan/playground-fixtures`, with the path of `tools/playground-fixtures/test-cases/`. A fixture's id is `<source>/<kind>/<snapshot name>`, where the source is `playground` or `lab`.
- **A case is a repository and a diff.** `cases/<kind>/` holds `repo/`, the repository before the change, a `meta.json` as the playground's kinds have one, one test file `<kind>.integration.test.ts`, one trimmed snapshot per test in `snapshots/<name>.snapshot.json`, and the stored code blocks of each in `code-blocks/<name>.code-blocks.json`. The `it` is titled after the change, holds its diffs, hands them to `setupTest`, runs `buildBranchCodegraph` with `isSegmented: true` through the mocked `@flightplan/git-forge`, and ends with `expectTraceSnapshot(codegraph)`. Titling a case, writing a diff and building a case repository follow [the playground guide](../playground-fixtures/docs/playground.md).
- **A trace snapshot is trimmed to what the band and its side panel draw.** `test-setup/trace-snapshot.ts` keeps the case's `title` and `diff`, and per segment its `title`, `importGraph`, the stored `traceDiagram` with its written parts, `codeReferences`, and the walkthrough's waypoints with only `id`, `declaration`, `range`, `codeBlockIds` and `children`. Context, blast, findings and waypoint prose are left out, because the Trace Diagram never shows them and a lab case exists only to watch the Trace Diagram. `src/fixtures/trace-snapshot.ts` puts the left-out fields back as empty values, so the trimmed snapshot reads as a playground snapshot and `toReviewArtifact` turns it into a `ReviewArtifact`.
- **A case compares only what is generated.** `expectTraceSnapshot` carries the written parts of the committed snapshot over to the new codegraph, trims the result and compares it with the file. Rewording a label never fails a case, a change in what the codegraph generates always does, and `nx run trace-diagram-lab:snapshot` rewrites what is generated and keeps what is written.
- **Only the written parts are edited.** They are a segment's `title`, the `title` and `description` of a Trace Diagram, the `label` and `description` of a trace node at any depth, and the `label` of its trigger labels and block labels, each written from its instructions in `packages/configurations`. Every other field, and the whole code-blocks file, is generated. A snapshot is never created or laid out by hand.
- **Reuse the playground's exports, never copy them.** The fixtures read through `@flightplan/playground-fixtures` (`getAllFixtureCases`, `getAllReviewArtifactFixturesByCase`, `getFixtureRepository`, `getReviewArtifactFixture`, `applyDiffs`, `readRepositoryFiles`, `readStoredGroups`, `caseSnapshotSchema`, `toReviewArtifact`), and the cases and their setup through `@flightplan/playground-fixtures/test-setup` (`setupTest`, `CASE_REF`, `caseSnapshotOf`, `readWrittenParts`, `storedCodeBlocksOf` and the rest). The git-forge mock is the playground's `test-setup/mock-git-forge.ts`, named by its path in `vite.config.mts`. A piece the lab needs and the playground does not export is exported there, not written again here.
- **`cases/` is skipped by ESLint and TypeScript, and `src/` never imports `cases/` or `test-setup/`.** A test file is checked by running it. Its imports resolve through the aliases of `vite.config.mts`: `@test-setup`, `@flightplan/codegraph`, `@flightplan/git-forge`, `@flightplan/playground-fixtures` and `@flightplan/playground-fixtures/test-setup`.
- **Two Vitest projects.** `trace-diagram-lab-node` runs the specs of `src/fixtures/` and `test-setup/` and every case, in Node with the git-forge mock. `trace-diagram-lab-browser` runs the `.spec.tsx` files of the page in jsdom.
- **The dev server loads the codegraph as plain ESM.** `src/server/` reaches `src/fixtures/` and the codegraph through Vite's `ssrLoadModule`, which, unlike Vitest and the backend's bundle, rejects a named import of a CommonJS package that Node cannot detect. Such a package is imported by its default export in the codegraph (`enhanced-resolve` in `import-graph/languages/typescript-resolve.ts`).
- **The screenshots are the page's test.** `tools/trace-diagram-lab-e2e` opens the lab on every fixture full screen, with no node selected, and compares one screenshot per Trace Diagram with its baseline in `src/__screenshots__/` of that project. Each fixture is one test named by its id, and each diagram of it, every tab included, is one screenshot taken through the Diagram select. Playwright starts the lab's own Vite on port 4412 and never reuses a running server, and `src/screenshot.css` hides the lab's toolbar while a screenshot is taken. The baselines are Linux renders, one set for every machine: `nx e2e trace-diagram-lab-e2e` runs `scripts/e2e-in-docker.sh`, which copies the working tree into the Playwright image `mcr.microsoft.com/playwright:v1.64.1-noble` (linux/amd64), installs there and runs `e2e-native`, the plain `playwright test`, writing back only `src/__screenshots__/` and `test-output/`. CI runs `e2e-native` inside the same image for every pull request and every push to main that affects the lab. The image tag follows the installed `@playwright/test` version: change both together. A change to a fixture, to the codegraph or to the band that changes what is drawn changes a baseline; read the new screenshot before keeping it.

## Layout

```
src/main.tsx, src/app/  the page: the select, previous and next, and TraceBand full screen
src/server/             serves GET /api/trace-fixtures to the page, in Node
src/fixtures/index.ts   lists and reads every playground and lab fixture as a ReviewArtifact
src/fixtures/trace-snapshot.ts  the trimmed snapshot's schema, and its reading as a playground snapshot
cases/<kind>/           <kind>.integration.test.ts, meta.json, repo/, snapshots/ and code-blocks/
test-setup/             expectTraceSnapshot and the trim, and the code blocks spec of every lab case
```

## Commands

| Command | What it does |
|---|---|
| `nx serve trace-diagram-lab` | Starts the lab on http://localhost:4410, with the fixtures served by the same Vite. `pnpm dev` at the root starts it too, next to the frontend, the backend and the site, on the same port and at https://trace-diagram-lab.flightplan.localhost through portless |
| `nx test trace-diagram-lab` | Runs both Vitest projects, and fails a case whose result differs from its snapshot |
| `nx run trace-diagram-lab:snapshot` | Runs the cases and rewrites their snapshots, then rewrites the `code-blocks/` file of every snapshot |
| `nx e2e trace-diagram-lab-e2e` | Takes the screenshot of every fixture in Docker (Docker Desktop must be running) and compares it with its baseline. `--update-snapshots` rewrites the baselines, and `--grep "<fixture id>"` limits it to one fixture |

## Verify

- `nx run-many -t eslint:lint typecheck test -p trace-diagram-lab`
- `nx run trace-diagram-lab:snapshot` after an intended change in what the codegraph generates, then read the difference before keeping it.
- `nx e2e trace-diagram-lab-e2e` after a change to what the lab draws, with `--update-snapshots` when the change is intended.
