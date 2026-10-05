# packages/codegraph

The engine that traces a change through the code. Read [codegraph](../../docs/vocabulary/codegraph.md) before changing anything here.

## Rules

- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/codegraph`. The package is consumed as source and has no build step.
- **The core is calculations.** Everything in `src/core/` takes its inputs as arguments and returns new data. Three modules hold state or touch the outside, and nothing else may: `virtual-fs.ts` patches `node:fs` while dependency-cruiser reads a repository held in memory, `tracer/parse.ts` loads the grammar `.wasm` files from `tree-sitter/`, and `walk-stats.ts` counts the work a walk did.
- **Syntax nodes are read, never cast.** A TypeScript or JavaScript node is read through `childAt`, `childrenAt`, `slotsAt` and `textAt` in `tracer/typescript/node.ts`. A missing child is `null` and the caller handles it.
- **An analysis returns what it found.** The value-flow analysers return findings: an invocation, an escape, or a task to analyse next. Only `traceValueFlow` folds them into a result, which keeps the order of the output independent of the order the files were read in.
- **Shared plumbing has one home.** A cache is a `Memo` (`memo.ts`), a group is `groupBy` (`group-by.ts`), a loop that must run in order is `mapInSequence`, `someInSequence`, `findInSequence` or `reduceInSequence` (`sequence.ts`), and a loop that runs until a state is reached is `iterateUntil` (`iterate.ts`).
- **One lint override.** `eslint.config.ts` turns off `n/no-sync` and `n/prefer-promises/fs` for `src/core/__tests__/virtual-fs.spec.ts`, because that spec tests the synchronous file system calls the mount answers. No other file may call a synchronous or callback `fs` function.
- **A rule has a fixture.** Every rule in the vocabulary's core logic has a test in the `__tests__/` folder beside the code that implements it. `demo.output.json` is the recorded output of `demo.ts`, checked as a file snapshot.

## Verify

- `nx run-many -t eslint:lint typecheck test -p codegraph`
