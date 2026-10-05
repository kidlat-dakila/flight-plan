# packages/codegraph

The engine that traces a change through the code, and the builders that turn a change into the parts of a review artifact and the bands the review page renders. Read [codegraph](../../docs/vocabulary/codegraph.md) before changing anything here.

## Rules

- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/codegraph`. The package is consumed as source and has no build step. It is marked `"sideEffects": false`, so the backend's bundle keeps only what the backend calls.
- **The engine stands alone.** `src/core/` imports nothing from the builder folders, and lint rejects it (`import-x/no-restricted-paths` in `eslint.config.ts`).
- **Shapes come from `packages/configurations`.** The artifact's types and the band schemas are imported from `@flightplan/configurations`, never declared here. A builder's own input types live beside it: `ReviewViewContext` and `BlobLinker` in `review-view-context.ts`, `ReviewedMarks` in `walkthrough/reviewed-marks.ts`, `DiagramSettings` in `journey/filter.ts`.
- **A builder is a calculation.** Everything outside `src/core/` takes plain data and returns new data. What only the backend knows arrives as an argument: forge links as a `blobLinkOf` function, the lines a comment thread pins as a `pinnedLinesOf` function, highlighted code as `HighlightedSource`. A builder never reads a discussion, a store or a forge.
- **The core is calculations.** Everything in `src/core/` takes its inputs as arguments and returns new data. Three modules hold state or touch the outside, and nothing else may: `virtual-fs.ts` patches `node:fs` while dependency-cruiser reads a repository held in memory, `tracer/parse.ts` loads the grammar `.wasm` files from `tree-sitter/`, and `walk-stats.ts` counts the work a walk did.
- **The import graph reads through git-forge.** `src/import-graph/` answers who imports a file and what it imports, at one commit of a change. `createImportGraphContext({ gitAdapter, baseCommit, headCommit })` reads a change once, and `traceImportGraph(context, filePath)` traces one file through it in both directions. Every file, file list and search comes from the `GitAdapter`: `blobs`, `listFiles` and `searchFiles`. A changed file is traced at the head commit and a deleted file at the base commit. `clusterImportGraphs(importGraphs)` joins the traces that share a file into one cluster, so a cluster is one connected part of one language.
- **An importer is searched for, then proven.** A language in `import-graph/languages/` gives the patterns an importer of a file would contain, `searchFiles` finds the candidates, and a candidate counts only when one of its imports resolves to the file. Dynamic `import()` calls are not imports.
- **A file of the AST graph is built once.** `src/ast-graph/languages/base.ts` holds `BaseASTGraphFile`, which every language extends. Its constructor takes a parsed tree and extracts the root encapsulations, the variables, the import variables and the references, and nothing changes them afterwards. A language implements the four `extract…` methods from the tree it is handed and never reads its own fields in them, because the base constructor runs them first.
- **The new code parses through `ast-graph/parser.ts`.** It parses with the native `tree-sitter` package and the `tree-sitter-typescript` and `tree-sitter-python` grammars, keeps one parser per grammar and the compiled queries, and is the only module of `ast-graph/` and `import-graph/` that holds state. Parsing is synchronous and a tree is freed by the garbage collector. Neither folder parses through `core/tracer/parse.ts`, which keeps `web-tree-sitter` and the `.wasm` files in `tree-sitter/` for the old engine.
- **The import graph reads git in batches.** A trace asks for the importers of every file of a level in one `searchFiles` call, and reads the files of a level in one `blobs` call through `RepositorySnapshot.preload`. Code in `import-graph/` never searches or reads once per file in a loop.
- **A tree is walked with a cursor.** `ast-graph/walk-tree.ts` holds `collectFromTree` and `collectFromNode`, which visit nodes through a tree-sitter `TreeCursor`. Code in `ast-graph/` walks with them, never with a recursive read of `children`.
- **Syntax nodes are read, never cast.** A TypeScript or JavaScript node is read through `childAt`, `childrenAt`, `slotsAt` and `textAt` in `tracer/typescript/node.ts`. A missing child is `null` and the caller handles it.
- **An analysis returns what it found.** The value-flow analysers return findings: an invocation, an escape, or a task to analyse next. Only `traceValueFlow` folds them into a result, which keeps the order of the output independent of the order the files were read in.
- **Shared plumbing has one home.** A cache is a `Memo` (`memo.ts`), a group is `groupBy` (`group-by.ts`), a loop that must run in order is `mapInSequence`, `someInSequence`, `findInSequence` or `reduceInSequence` (`sequence.ts`), and a loop that runs until a state is reached is `iterateUntil` (`iterate.ts`).
- **One lint override.** `eslint.config.ts` turns off `n/no-sync` and `n/prefer-promises/fs` for `src/core/__tests__/virtual-fs.spec.ts`, because that spec tests the synchronous file system calls the mount answers. No other file may call a synchronous or callback `fs` function.
- **A case is a repository and a diff.** `cases/<language or repository kind>/` holds one test file, `<kind>.integration.test.ts`, the repository it reads in `repo/`, and one committed snapshot per test in `snapshots/<test name>.snapshot.json`. `repo/` is the repository before the change. A test calls `setupTest({ repoPath, diffs })`, where `diffs` are unified diff texts that each open a file with a `diff --git` line, so one repository serves many changes.
- **The cases read through a mocked `@flightplan/git-forge`.** `test-setup/mock-git-forge.ts` is a Vitest setup file that replaces `assembleGitAdapter`, `readRemote` and `repoName`, and keeps the rest of the package real. `setupTest` makes them answer from the case: the base commit is the files in `repo/`, the head commit is those files with the diffs applied, and the diff of the change is the diffs. Before `setupTest` is called they reject, and they are reset after every test.
- **`repo/` is data.** ESLint, TypeScript, Vitest and Nx all skip `cases/*/repo/`, so a case repository may hold code that would not lint, compile or resolve. The package's source never imports `cases/` or `test-setup/`, and lint rejects it.
- **A rule has a fixture.** Every rule in the vocabulary's core logic has a test in the `__tests__/` folder beside the code that implements it. `demo.output.json` is the recorded output of `demo.ts`, checked as a file snapshot.

## Layout

```
src/core/         the engine
src/import-graph/ the files a file imports and is imported by, traced through git-forge, with one module per language in languages/
src/ast-graph/    the encapsulations, variables and uses inside one file, with one class per language in languages/
src/scaffold/     a change's diff and files → the first review artifact: hunks, declarations, File Sections and waypoints, source lines
src/code/         source lines, code links, highlighting a review, marked source for fixtures
src/prose/        Markdown prose → the prose shapes, and count labels
src/diagram/      what both diagrams share: the configuration, the legend, levels through edges
src/journey/      Journey Flow Diagram: filter, layout, band
src/blast/        Blast Diagram: filter, shields, layout, band
src/walkthrough/  Code Walkthrough: waypoints, reviewed marks, file rows, band and controls
cases/<kind>/     <kind>.integration.test.ts, repo/ and snapshots/ for one language or repository kind
test-setup/       setupTest, the git-forge mock, applying diffs to a repository, the case snapshot
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p configurations git-forge codegraph backend`
- `nx test codegraph` checks every case against its committed snapshot. `nx run codegraph:snapshot` rewrites the snapshots after an intended change in behaviour.
- `nx build backend`, then start `node dist/apps/backend/main.js` once: the bundle is CJS and only the built server shows a package that does not load.
