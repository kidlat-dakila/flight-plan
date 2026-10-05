# packages/codegraph

The engine that traces a change through the code, and the builders that turn a change into the parts of a review artifact and the bands the review page renders. Read [codegraph](../../docs/vocabulary/codegraph.md) before changing anything here.

## Rules

- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/codegraph`. The package is consumed as source and has no build step. It is marked `"sideEffects": false`, so the backend's bundle keeps only what the backend calls.
- **The engine stands alone.** `src/core/` imports nothing from the builder folders, and lint rejects it (`import-x/no-restricted-paths` in `eslint.config.ts`).
- **Shapes come from `packages/configurations`.** The artifact's types and the band schemas are imported from `@flightplan/configurations`, never declared here. A builder's own input types live beside it: `ReviewViewContext` and `BlobLinker` in `review-view-context.ts`, `ReviewedMarks` in `walkthrough/reviewed-marks.ts`, `DiagramSettings` in `journey/filter.ts`.
- **A builder is a calculation.** Everything outside `src/core/` takes plain data and returns new data. What only the backend knows arrives as an argument: forge links as a `blobLinkOf` function, the lines a comment thread pins as a `pinnedLinesOf` function, highlighted code as `HighlightedSource`. A builder never reads a discussion, a store or a forge.
- **The core is calculations.** Everything in `src/core/` takes its inputs as arguments and returns new data. Three modules hold state or touch the outside, and nothing else may: `virtual-fs.ts` patches `node:fs` while dependency-cruiser reads a repository held in memory, `tracer/parse.ts` loads the grammar `.wasm` files from `tree-sitter/`, and `walk-stats.ts` counts the work a walk did.
- **Syntax nodes are read, never cast.** A TypeScript or JavaScript node is read through `childAt`, `childrenAt`, `slotsAt` and `textAt` in `tracer/typescript/node.ts`. A missing child is `null` and the caller handles it.
- **An analysis returns what it found.** The value-flow analysers return findings: an invocation, an escape, or a task to analyse next. Only `traceValueFlow` folds them into a result, which keeps the order of the output independent of the order the files were read in.
- **Shared plumbing has one home.** A cache is a `Memo` (`memo.ts`), a group is `groupBy` (`group-by.ts`), a loop that must run in order is `mapInSequence`, `someInSequence`, `findInSequence` or `reduceInSequence` (`sequence.ts`), and a loop that runs until a state is reached is `iterateUntil` (`iterate.ts`).
- **One lint override.** `eslint.config.ts` turns off `n/no-sync` and `n/prefer-promises/fs` for `src/core/__tests__/virtual-fs.spec.ts`, because that spec tests the synchronous file system calls the mount answers. No other file may call a synchronous or callback `fs` function.
- **A rule has a fixture.** Every rule in the vocabulary's core logic has a test in the `__tests__/` folder beside the code that implements it. `demo.output.json` is the recorded output of `demo.ts`, checked as a file snapshot.

## Layout

```
src/core/         the engine
src/scaffold/     a change's diff and files → the first review artifact: hunks, declarations, File Sections and waypoints, source lines
src/code/         source lines, code links, highlighting a review, marked source for fixtures
src/prose/        Markdown prose → the prose shapes, and count labels
src/diagram/      what both diagrams share: the configuration, the legend, levels through edges
src/journey/      Journey Flow Diagram: filter, layout, band
src/blast/        Blast Diagram: filter, shields, layout, band
src/walkthrough/  Code Walkthrough: waypoints, reviewed marks, file rows, band and controls
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p configurations codegraph backend`
- `nx build backend`, then start `node dist/apps/backend/main.js` once: the bundle is CJS and only the built server shows a package that does not load.
