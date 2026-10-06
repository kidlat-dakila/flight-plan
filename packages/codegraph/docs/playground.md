# Playground

The playground is where the codegraph is tested end to end. Each test hands a small repository and a change to `buildBranchCodegraph`, and compares the whole result with a snapshot committed beside it.

It lives in `packages/codegraph/playground/`. Use it for what a unit spec cannot show: that a real change in a real layout of files comes out as the right segments, diagrams and walkthrough.

## Terms

| Term | Meaning |
|---|---|
| **Kind** | One folder of the playground: a language (`typescript`, `python`) or a repository setup (`monorepo`, `barrel-exports`). |
| **Case** | One test: a repository, a change to it, and the snapshot of what the codegraph builds from them. |
| **Case repository** | The files in a kind's `repo/` folder. It is the repository *before* the change. |
| **Diff** | A unified diff text written in the test. Applying the diffs of a case to the case repository gives the repository *after* the change. |

## Structure

```text
packages/codegraph/
├── playground/
│   └── <kind>/
│       ├── <kind>.integration.test.ts   every case of the kind
│       ├── repo/                        the case repository, before the change
│       └── snapshots/
│           └── <test name>.snapshot.json   one per case, committed
└── test-setup/
    ├── mock-git-forge.ts    replaces three functions of @flightplan/git-forge
    ├── setup-test.ts        setupTest({ repoPath, diffs })
    ├── case-adapter.ts      the git adapter a case reads through
    ├── apply-diffs.ts       base files + diffs → head files
    ├── repository-files.ts  reads repo/ from disk
    └── case-snapshot.ts     expectCaseSnapshot(value)
```

One kind has one test file and one case repository. Many cases share that repository, because each case brings its own diffs.

## What is mocked

Only the way a repository is opened. The codegraph itself, and every other part of `@flightplan/git-forge`, runs for real.

`test-setup/mock-git-forge.ts` is a Vitest setup file, listed under `setupFiles` in `vitest.config.mts`, so it applies to every test of the package without an import. It replaces three functions:

| Function | Before `setupTest` | After `setupTest` |
|---|---|---|
| `assembleGitAdapter` | Rejects | Resolves to the case adapter |
| `readRemote` | Rejects | Resolves to `CASE_REMOTE` (`flight-plan/case` on `forge.test`) |
| `repoName` | Rejects | Resolves to `case` |

All three are reset after every test, so a case never reads the repository of the case before it. A test that forgets `setupTest` fails with a message that says so.

### The case adapter

`setupTest({ repoPath, diffs })` builds the adapter that `assembleGitAdapter` returns. It answers from memory. No git command runs and nothing is written to disk.

| The codegraph asks | The case adapter answers |
|---|---|
| `baseSha(ref)` | `BASE_COMMIT`, forty `1`s |
| `headSha(ref)` | `HEAD_COMMIT`, forty `2`s |
| `compare(base, head)` | The changed files of the diffs, each with its patch |
| `diff(ref)` | The diffs, joined |
| `listFiles(commit)` | The paths in `repo/` at the base commit; those paths with the diffs applied at the head commit |
| `blob`, `blobs` | The text of a file at that commit |
| `searchFiles(commit, search)` | The files at that commit whose text matches a pattern, line by line, as `git grep` does |
| `listBranches()` | One branch, `CASE_BRANCH` (`case-change`) |

Any other commit is refused. Everything about a forge (pull requests, reviewers, labels, people) is refused as unsupported: a case is a plain git repository.

## Add a case to a kind that exists

1. Open `playground/<kind>/<kind>.integration.test.ts`.
2. Write the diff as a constant. See [Writing a diff](#writing-a-diff).
3. Add an `it` that sets the case up, builds the codegraph and snapshots it:

   ```ts
   it("builds the codegraph of a change to one function", async () => {
     setupTest({ repoPath: REPO_PATH, diffs: [HELD_STOCK_DIFF] })

     const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

     await expectCaseSnapshot(codegraph)
   })
   ```

4. Write the snapshot: `nx run codegraph:snapshot`.
5. Read the new snapshot file. A snapshot only proves that the output did not change, so the first one must be checked by hand. See [Reading a snapshot](#reading-a-snapshot).
6. Commit the test and the snapshot together.

The name of the `it` names the snapshot file: `"builds the codegraph of a change to one function"` becomes `builds-the-codegraph-of-a-change-to-one-function.snapshot.json`. Renaming a test therefore leaves the old snapshot behind. Delete it in the same change.

## Add a kind

1. Create `playground/<kind>/repo/` and put the repository in it, as it is before any change. Keep it small: a case repository needs only the files that make its point.
2. Create `playground/<kind>/<kind>.integration.test.ts`. The file name must end in `.integration.test.ts`, or Vitest does not run it:

   ```ts
   import { join } from "node:path"
   import { buildBranchCodegraph } from "@/index"
   import { assembleGitAdapter, type GitAdapter, type TargetRef } from "@flightplan/git-forge"
   import { CASE_BRANCH } from "@test-setup/case-adapter"
   import { expectCaseSnapshot } from "@test-setup/case-snapshot"
   import { setupTest } from "@test-setup/setup-test"

   const REPO_PATH = join(import.meta.dirname, "repo")
   const CASE_REF: TargetRef = { kind: "branch", name: CASE_BRANCH }

   const openRepository = async (root: string): Promise<GitAdapter> => {
     const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
     if (!resolved.ok) throw resolved.error
     return resolved.gitAdapter
   }

   describe("<kind>", () => {
     it("builds the codegraph of <the change>", async () => {
       setupTest({ repoPath: REPO_PATH, diffs: [SOME_DIFF] })

       const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

       await expectCaseSnapshot(codegraph)
     })
   })
   ```

3. Follow steps 4 to 6 of [Add a case](#add-a-case-to-a-kind-that-exists).

`playground/typescript/` is the example to copy from.

## Writing a diff

A diff is the text `git diff` prints, as a constant in the test file:

```ts
const HELD_STOCK_DIFF = [
  "diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts",
  "--- a/src/inventory/stock.ts",
  "+++ b/src/inventory/stock.ts",
  "@@ -1,0 +2 @@",
  "+const heldBySku: Record<string, number> = { \"tea-01\": 2 };",
  "@@ -4 +5 @@",
  "-  return stockBySku[sku] ?? 0;",
  "+  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);",
].join("\n")
```

- **Every file opens with a `diff --git a/<path> b/<path>` line.** A diff without one is refused with `UnreadableDiffError`.
- **The removed and context lines must match `repo/` exactly.** A diff that does not apply is refused with `DiffMismatchError`, which names the file.
- **Paths are relative to `repo/`.**
- **A case can take several diffs**, and one diff can change several files. Use one diff per file when the files tell different parts of the story.
- **A new file** has `--- /dev/null` as its old side, **a deleted file** has `+++ /dev/null` as its new side, and a rename is written as git writes it.

The simplest way to get a correct diff is to let git write it: copy `repo/` somewhere, make the change, run `git diff --no-index`, and fix the paths.

## Reading a snapshot

A snapshot is the result of `buildBranchCodegraph`, written as JSON. A `Map` is written as the record of its entries. It has one entry in `segments` per cluster of the import graph:

| Field | What to check |
|---|---|
| `importGraph` | The files the change reaches through imports, each with `diffType`, `importedBy` and `importsTo`. A file you expect and do not see means an import was not resolved. |
| `astGraph` | What each file holds: its encapsulations, variables, uses, and where the changed lines landed (`diffLocations`, `looseDiffLines`). The longest part, and rarely the one to read first. |
| `journeyFlowDiagram` | The path from each entry point down to the changed declarations. `null` when the change touches no function, class or value. |
| `blastRadiusDiagram` | The changed declarations at ring 0 and everything that uses them around them. Never empty for a segment that has a change. |
| `codeWalkthrough` | One File Section per changed file, one waypoint per changed declaration, each with its `category` and the ids of its nodes in the two diagrams. |

Read the two diagrams and the walkthrough first, and go to `astGraph` only when one of them is wrong.

## Rules

- **`repo/` is data, not code.** ESLint, TypeScript, Vitest and Nx all skip `playground/*/repo/`. A case repository may hold code that does not compile, imports that do not resolve and a `package.json` whose dependencies are not installed.
- **A case repository never changes for one case.** A file added to `repo/` is seen by every case of the kind and can change their snapshots. Put what only one case needs in that case's diff.
- **The package's source never imports the playground or `test-setup/`.** Lint rejects it.
- **A case tests `buildBranchCodegraph`, nothing smaller.** The behaviour of one function belongs in the `__tests__/` folder beside it.
- **No real git, network or clock.** A case that needs one is not a case.

## Commands

| Command | What it does |
|---|---|
| `nx test codegraph` | Runs every spec and every case, and fails a case whose result differs from its snapshot |
| `nx run codegraph:snapshot` | Runs the cases only and rewrites their snapshots |
| `nx run-many -t eslint:lint typecheck test -p codegraph` | The full check before a change is done |

Rewrite a snapshot only after an intended change in behaviour, and read the difference in `git diff` before committing it: a rewritten snapshot accepts whatever the code now produces.
