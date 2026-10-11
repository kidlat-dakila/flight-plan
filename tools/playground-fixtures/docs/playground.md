# Playground fixtures

`tools/playground-fixtures` is where the codegraph is tested end to end, and where the results of those tests are kept for other projects to read.

It does two things:

- **It runs test cases.** Each one hands a small repository and a change to `buildBranchCodegraph` of `@flightplan/codegraph`, and compares the whole result with a snapshot committed beside it. Use a test case for what a unit spec cannot show: that a real change in a real layout of files comes out as the right segments, diagrams and walkthrough.
- **It serves the snapshots as fixtures.** `src/index.ts` lists and reads the committed snapshots, so an app can render a case without running the codegraph. See [Reading the snapshots from code](#reading-the-snapshots-from-code).

The test cases live in `tools/playground-fixtures/test-cases/`. The codegraph itself, and its unit specs, live in `packages/codegraph`.

## Terms

| Term | Meaning |
|---|---|
| **Kind** | One folder of `test-cases/`: a language (`typescript`) or a repository setup with its stack (`react-spa-query-zustand`). |
| **Case** | One test: a repository, a change to it, and the snapshot of what the codegraph builds from them. |
| **Case repository** | The files in a kind's `repo/` folder. It is the repository *before* the change. |
| **Context** | A Markdown text that says what the diffs of a case change. It is written in the case's snapshot, under the title and above the codegraph. |
| **Written parts** | What an agent writes in a review, as opposed to what the codegraph generates: the context, and the prose of the diagrams and the walkthrough (a title for each segment, a label and a description for a journey node, a label for each of its trigger labels, an impact type and an impact reason for a blast file, a title and a reading for a waypoint). They are in the snapshot only, never in a test. |
| **Snapshot** | The committed JSON file of a case: its title, its context, its diff and its codegraph with the written parts in it. It is a complete review of the change. |
| **Fixture** | A snapshot as another project reads it, through `src/index.ts`. A fixture case is a kind, and a review artifact fixture is one snapshot. |
| **Diff** | A unified diff text written in the test. Applying the diffs of a case to the case repository gives the repository *after* the change. |

## Structure

```text
tools/playground-fixtures/
├── src/
│   ├── index.ts             the functions another project reads the snapshots through
│   ├── review-artifact.ts   a snapshot and its files after the change → a review artifact
│   ├── apply-diffs.ts       base files + diffs → head files
│   └── repository-files.ts  reads repo/ from disk
├── docs/
│   └── playground.md        this guide
├── vitest.config.mts        runs the cases, and declares the aliases they import through
├── test-cases/
│   └── <kind>/
│       ├── <kind>.integration.test.ts   every case of the kind
│       ├── meta.json                    what the case repository is built with
│       ├── repo/                        the case repository, before the change
│       └── snapshots/
│           └── <test name>.snapshot.json   one per case, committed
└── test-setup/
    ├── mock-git-forge.ts    replaces three functions of @flightplan/git-forge
    ├── setup-test.ts        setupTest({ repoPath, diffs })
    ├── case-adapter.ts      the git adapter a case reads through
    ├── written-parts.ts     withWrittenParts(codegraph, written)
    └── case-snapshot.ts     expectCaseSnapshot(codegraph)
```

One kind has one test file, one `meta.json` and one case repository. Many cases share that repository, because each case brings its own diffs.

## What is mocked

Only the way a repository is opened. The codegraph itself, and every other part of `@flightplan/git-forge`, runs for real.

`test-setup/mock-git-forge.ts` is a Vitest setup file, listed under `setupFiles` in `vitest.config.mts`, so it applies to every test of the project without an import. It replaces three functions:

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

1. Open `test-cases/<kind>/<kind>.integration.test.ts`.
2. Add an `it` titled after the change. See [Titling a case](#titling-a-case). Inside it, set the case up with its diffs, build the codegraph and snapshot it. See [Writing a diff](#writing-a-diff).

   ```ts
   it("Modified function stockOf to subtract held stock", async () => {
     setupTest({
       repoPath: REPO_PATH,
       diffs: [
         [
           "diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts",
           "--- a/src/inventory/stock.ts",
           "+++ b/src/inventory/stock.ts",
           "@@ -1,0 +2 @@",
           "+const heldBySku: Record<string, number> = { \"tea-01\": 2 };",
           "@@ -4 +5 @@",
           "-  return stockBySku[sku] ?? 0;",
           "+  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);",
         ].join("\n"),
       ],
     })

     const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

     await expectCaseSnapshot(codegraph)
   })
   ```

   The diffs are written inside the `it`, not as constants above it. See [A test holds the change](#a-test-holds-the-change).

3. Write the snapshot: `nx run playground-fixtures:snapshot`.
4. Read the new snapshot file. A snapshot only proves that the output did not change, so the first one must be checked by hand. See [Reading a snapshot](#reading-a-snapshot).
5. Write the context and the rest of the written parts in the snapshot file. See [Writing the written parts](#writing-the-written-parts).
6. Run `nx test playground-fixtures`. Nothing else checks a test file: lint and the type checker skip `test-cases/`.
7. Commit the test and the snapshot together.

### Titling a case

The title of the `it` is the title of the change, written like the title of a commit. It has three parts: a verb, the kind of thing that changed, and what it is.

```text
<Implement | Added | Modified | Deleted> <kind> <what>
```

`Modified function stockOf to subtract held stock`

**The verb** says what was done:

| Verb | The change | Example |
|---|---|---|
| `Implement` | Builds something new that spans several declarations or files | `Implement page Wishlist` |
| `Added` | Adds something to code that exists | `Added two pages AddUser and DeleteUser` |
| `Modified` | Changes what existing code does | `Modified function stockOf to subtract held stock` |
| `Deleted` | Removes code | `Deleted function formatLegacyPrice` |

**The kind** says what sort of thing changed, so a reader knows what to expect before reading a line of the case. It is a word of the code or a word of the framework:

| Kind | Use it for |
|---|---|
| `function`, `class`, `method`, `variable`, `type`, `import` | A declaration, named as the language names it |
| `module` | A whole file, when the change is to the file and not to what it holds: a move or a rename |
| `component`, `hook`, `page`, `layout`, `context` | A part of a user interface |
| `route`, `endpoint`, `middleware`, `action`, `job` | Something a request or a schedule reaches |
| `store`, `slice`, `selector`, `query`, `mutation`, `schema`, `model` | State and data |
| `feature` | A change that spans several kinds and has a name in the product |

Pick the most specific kind that is true: a React component is a `component`, not a `function`. A count goes before the kind when the change is to several things of one kind, and the kind is then plural: `Added two pages AddUser and DeleteUser`.

**What** is the name the thing has in the code, written as the code writes it, then what was done to it when the verb alone does not say: `to subtract held stock`.

The title is not a description of the test: every case builds a codegraph, so `"builds the codegraph of…"` says nothing. It is not the effect alone either: `"Subtract held stock from available stock"` names neither what was changed nor what kind of thing it is.

A case whose diffs do several of these is titled after the one the others serve. The context lists the rest.

The title is written into the snapshot as its `title`, and it names the snapshot file: `"Modified function stockOf to subtract held stock"` becomes `modified-function-stockof-to-subtract-held-stock.snapshot.json`. Two cases of a kind therefore never share a title, and renaming a case leaves the old snapshot behind. Delete it in the same change.

## Add a kind

1. Create `test-cases/<kind>/repo/` and put the repository in it, as it is before any change. Give it the parts listed under [Case repository composition](#case-repository-composition), each of them small.
2. Create `test-cases/<kind>/meta.json`. See [Describing a kind](#describing-a-kind).
3. Create `test-cases/<kind>/<kind>.integration.test.ts`. The file name must end in `.integration.test.ts`, or Vitest does not run it:

   ```ts
   import { join } from "node:path"
   import { buildBranchCodegraph } from "@flightplan/codegraph"
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
     it("<Implement | Added | Modified | Deleted> <kind> <what>", async () => {
       setupTest({
         repoPath: REPO_PATH,
         diffs: [
           [
             "diff --git a/<path> b/<path>",
             "<the rest of the diff, one line per entry>",
           ].join("\n"),
         ],
       })

       const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

       await expectCaseSnapshot(codegraph)
     })
   })
   ```

   A test file imports through three aliases only, declared in `vitest.config.mts`: `@test-setup/<module>`, `@flightplan/codegraph` and `@flightplan/git-forge`. The path aliases of `tsconfig.json` do not reach it, because TypeScript does not include `test-cases/`.

4. Follow steps 3 to 7 of [Add a case](#add-a-case-to-a-kind-that-exists).

`test-cases/react-spa-query-zustand/` is the example to copy from: a full case repository and twenty cases, one per kind of changeset. `test-cases/typescript/` is the smallest kind there can be. `test-cases/vue-spa-query-pinia/` is a Vue case repository with five cases, and `test-cases/python-flask/` a Flask service with one.

## Describing a kind

Every kind has a `meta.json` beside its test file. It says what the case repository is built with, so a reader knows what a kind covers without opening `repo/`.

```json
{
  "title": "React SPA with react-router",
  "packages": ["react", "react-dom", "react-router", "zustand", "@tanstack/react-query"],
  "language": "typescript",
  "mainFramework": "react"
}
```

| Field | Meaning |
|---|---|
| `title` | The name of the kind as a person would say it: the setup, then what sets it apart from the other kinds of that setup. |
| `packages` | The packages the case repository imports, by the name they are installed under. An empty list when it imports none. |
| `language` | The language the case repository is written in: `typescript` or `python`. A repository of `.tsx` or `.vue` files is `typescript`. Plain JavaScript is not supported: a case repository has no `.js` or `.jsx` file. |
| `mainFramework` | The framework the repository is built around, such as `react`, `vue`, `next`, `fastify` or `django`. `null` when it has none. |

All four fields are required. `packages` lists what the files in `repo/` import, so a package added to or dropped from the case repository is added to or dropped from the list in the same change.

## Case repository composition

A case repository has the shape of a production repository and the size of a fixture. The codegraph is only tested by what a real repository does to it: a change at the bottom of a stack that climbs through layers to several entry points, imports that go through aliases and barrels. A repository of two files that import each other shows none of that.

Five rules hold for every composition:

- **Every part is there, and every part is small.** One or two files per part, a handful of lines per file. A route file with two routes is enough; a route file with twenty adds nothing.
- **Libraries are imported, not installed.** The files import the framework, the ORM and the rest as real code would, and the kind's `meta.json` lists them. `repo/` is data, so nothing is resolved or run.
- **It holds only what the codegraph reads.** That is the source files of a supported language and the files that say how an import resolves: `tsconfig.json`, `pyproject.toml`, and in a monorepo the `package.json` that names each package. Bundler configuration, `index.html`, stylesheets, images, translation files, migrations and CI files are left out.
- **One domain runs through the whole repository.** Every case repository is a slice of the same kind of product, such as a storefront with a catalogue, a cart and a checkout, so its files connect the way real ones do.
- **It has at least two features that share code, and one that shares none.** The shared code gives a change several paths to climb. The unrelated feature gives a second segment when a case changes both.

The compositions below list the parts. The examples name libraries a kind may pick from; a kind picks one per part and uses it throughout.

### Backend

| Part | What it holds | Why a case needs it | Examples |
|---|---|---|---|
| Project configuration | The compiler or interpreter settings, with a path alias | Imports resolve through the alias, not only through relative paths | `tsconfig.json` with `paths`; `pyproject.toml` |
| Server entry | The file that creates the app, registers the middleware and mounts the routes | The top of every HTTP path | `src/main.ts`, `src/server.ts`; `app/main.py` |
| REST framework | Route or controller files, one per resource, each with a few handlers | The entry points a change is traced up to | Fastify, Express, NestJS; FastAPI, Django REST framework, Flask |
| Middleware | Authentication, error handling, request logging | Code that runs on every route but that no handler calls by name | A Fastify hook, an Express middleware, a NestJS guard; a FastAPI dependency |
| Request and response schemas | The shapes a handler validates against | Values and types declared outside every function, used by many handlers | zod, class-validator; pydantic |
| Services | The domain logic, one module per feature, called by the handlers | The middle layer, where most cases put their change | `src/checkout/reserve.ts`; `shop/checkout/reserve.py` |
| ORM | The models or the schema, and the repositories or queries that read and write them | The bottom layer, with the most users above it | Prisma, Drizzle, TypeORM; SQLAlchemy, Django ORM |
| Background jobs | A worker, a queue consumer or a scheduled task that calls the same services as the routes | A second kind of entry point onto the same code | BullMQ, node-cron; Celery, APScheduler |
| External clients | A wrapper around another service: payments, email, object storage | A call that leaves the repository | An HTTP client module, an SDK wrapper |
| Settings | One module that reads the environment and exports the values | A module-level value used across every layer | `src/config.ts`; `shop/settings.py` |
| Shared code | Errors, constants, helpers, a logger | Hub files with many importers | `src/shared/errors.ts`; `shop/common/errors.py` |
| Tests | A spec beside a service, and one that calls a route | Importers that are not part of any path a user runs | Vitest, Jest; pytest |

### Frontend

| Part | What it holds | Why a case needs it | Examples |
|---|---|---|---|
| Project configuration | The compiler settings, with a path alias | Imports resolve through the alias | `tsconfig.json` with `paths` |
| App entry | The file that mounts the app and wraps it in its providers | The top of every path | `src/main.tsx`; `src/main.ts` with `App.vue` |
| UI framework | Components written in the framework's own file types | The syntax the kind is there to cover | React (`.tsx`); Vue (`.vue`) |
| Routing library | The route table or the route files, and one page per route | The entry points a change is traced up to | React Router, TanStack Router, Next.js routes; Vue Router |
| Pages and feature components | A page built from components that live beside it, two or three levels deep | Props and handlers passed down through several components | `routes/checkout/-components/`; `views/` and `components/` |
| Shared components | The buttons, inputs and dialogs every page uses | Hub files with many importers, where a small change has a wide blast | A `components/ui/` folder, shadcn/ui, Vuetify |
| State management library | A store with its state, its actions and the selectors or getters that read it | State written in one component and read in another, with no import between the two | Redux Toolkit, Zustand, Jotai; Pinia |
| Server state and API client | The functions that call the backend, and the hooks or composables that wrap them | A function handed to a library hook and used through its result | TanStack Query, SWR, Apollo; axios, `fetch` |
| Hooks or composables | Logic shared between components | A layer between a component and what it calls | `useCart`; `useCart` as a composable |
| Context or provide and inject | A provider near the root and consumers below it | A value that reaches a component without being passed to it | React context; Vue `provide` and `inject` |
| Forms and validation | A form, its schema and its submit handler | A handler passed as a value, and a schema shared with other code | React Hook Form, Formik, VeeValidate; zod, yup |
| Barrels | An `index.ts` that re-exports a folder | A name that reaches its user through a re-export, and under an alias | `components/index.ts` |
| Types, constants and helpers | Shared types, route names, formatters | Declarations outside every function, used by many files | `src/lib/format.ts`, `src/types.ts` |

### Monorepo

A monorepo case repository holds smaller versions of the two compositions above, and adds what joins them.

| Part | What it holds | Why a case needs it | Examples |
|---|---|---|---|
| Root configuration | A base compiler configuration every project extends, with the workspace's aliases | Resolution through `extends`, and through one tsconfig per project | `tsconfig.base.json` |
| Applications | At least two, each with its own manifest, configuration and entry: one frontend, one backend | A change in a shared package is traced into both | `apps/web`, `apps/api` |
| Shared packages | A UI package, a package of shapes both applications use, a package of helpers | The code a monorepo exists to share, and where a change reaches furthest | `packages/ui`, `packages/contracts`, `packages/utils` |
| Package manifests | A `package.json` per package, with its name and its `exports` or `main` | An import by package name resolves to a file through it | `"name": "@shop/ui"`, `"exports": { ".": "./src/index.ts" }` |
| Package entries | One `index.ts` per package that re-exports what the package offers | Every import from another project passes through a barrel | `packages/ui/src/index.ts` |
| Imports across projects | Applications importing packages by name, and one package importing another | A path that crosses three projects | `import { Button } from "@shop/ui"` |
| Project-local aliases | An alias that means a different folder in each project | The same specifier resolving differently depending on the importer | `@/` as each project's `src/` |
| A project nothing shares with | A package or application no other project imports and that imports none | A change in it is a segment of its own | `tools/scripts` |
| A second language | A service in another language beside the rest, with its own manifest | A change in both languages gives separate segments | A Python worker with its `pyproject.toml` |

## Writing a diff

A diff is the text `git diff` prints, written as a list of lines inside the `diffs` of the case's `setupTest` call:

```ts
setupTest({
  repoPath: REPO_PATH,
  diffs: [
    [
      "diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts",
      "--- a/src/inventory/stock.ts",
      "+++ b/src/inventory/stock.ts",
      "@@ -1,0 +2 @@",
      "+const heldBySku: Record<string, number> = { \"tea-01\": 2 };",
      "@@ -4 +5 @@",
      "-  return stockBySku[sku] ?? 0;",
      "+  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);",
    ].join("\n"),
  ],
})
```

- **Every file opens with a `diff --git a/<path> b/<path>` line.** A diff without one is refused with `UnreadableDiffError`.
- **The removed and context lines must match `repo/` exactly.** A diff that does not apply is refused with `DiffMismatchError`, which names the file.
- **Paths are relative to `repo/`.**
- **A case can take several diffs**, and one diff can change several files. Use one diff per file when the files tell different parts of the story.
- **A new file** has `--- /dev/null` as its old side, **a deleted file** has `+++ /dev/null` as its new side, and a rename is written as git writes it.

The simplest way to get a correct diff is to let git write it: copy `repo/` somewhere, commit it, make the change, and run `git diff -U0 -M`. Drop the `index` and `similarity index` lines, and keep `new file mode`, `deleted file mode`, `rename from` and `rename to`: they are what says a file was added, deleted or moved.

## Choosing the cases of a kind

The cases of a kind cover the kinds of changeset a reviewer meets, not one change repeated on different files. A kind is complete when it has at least one case of each:

| Changeset | What makes it different |
|---|---|
| One line in one function | The smallest change, at the bottom, the middle and the top of the stack |
| A change inside a nested declaration | A handler inside a component, a callback inside an object handed to a call |
| A change to a module-level value | A constant, a store, a schema, a route table: a variable, not a function |
| A change to a type only | Nothing that runs is touched |
| A change to an import only | A statement outside every declaration |
| A signature change with its call sites | One declaration and every file that calls it |
| A new declaration with its first use | Something added and something modified, in two files |
| New files | A page or a feature through several layers, with the files that wire it in |
| A deleted file | With the edits to the files that used it |
| Lines only removed | A deleted function, with nothing added in its place |
| A moved or renamed file | With the import lines that follow it |
| A change to a hub | A shared component or a client that every feature reaches |
| A function handed over as a value | A query function, a selector, a submit handler: never called by name |
| A dynamic import | A route or a component loaded lazily |

`test-cases/react-spa-query-zustand/` has one case of each.

## Writing the written parts

A snapshot is a complete review of its change, so it holds what an agent writes as well as what the codegraph generates. The written parts are written in the snapshot file, by hand or by an agent, and nowhere else.

| What | Where in the snapshot | Fields |
|---|---|---|
| The context | `context`, one line of Markdown per entry | |
| A segment | `codegraph.segments[]` | `title` |
| A journey node | `journeyFlowDiagram.journeyNodes[]`, and the `children[]` of a node at any depth | `label`, `description` |
| A trigger label of a journey node | `triggerLabels[]` of a node | `label` |
| A blast file the change did not touch | `blastRadiusDiagram.nodes[]` | `impactType` (`breaks`, `behaviour-changes` or `unaffected`), and `impactReason` on the first two |
| The walkthrough | `codeWalkthrough` | `intro` |
| A file | `codeWalkthrough.files[]` | `title`, `summary` |
| A waypoint | `codeWalkthrough.files[].waypoints[]` | `title`, `reading`, `needsAttention` |

Every other field of a snapshot is generated, and editing one fails the case.

### The instructions a written part follows

A written part is written the way an agent writes it in a real review, from the instructions in `packages/configurations/src/`. Read the instructions of a field before writing it, and follow them exactly.

- `system-instructions/` says what each field is. `artifactFormat.md`, `writingStyle.md` and `codeLinks.md` hold for every field: read them first.
- `default-configurations/standard/` says how each field is written. Its `writingStyle.md` holds for every field too.
- A file is named after the path of its field in a review artifact, and a snapshot names three parts differently: `journeyFlowDiagram` is `journey`, `blastRadiusDiagram` is `blast` and `codeWalkthrough` is `walkthrough`. The `label` of a node of `journeyFlowDiagram` is written from `journey.nodes.label.md`, the `label` of one of its trigger labels from `journey.nodes.triggerLabels.label.md`, the `reading` of a waypoint from `walkthrough.files.waypoints.reading.md`. `<field>.<option>.md` says what one option of a field means.
- A written part is true of the code: of the files in `repo/` with the diffs of the case applied. Read them before writing.

### What may be edited in a snapshot

Only the written parts in the table above, and only where they are missing or where a change to the case made them wrong.

- **A generated value is never edited**: a snapshot's `title` and `diff`, `importGraph`, an `id`, a `path`, a `declaration`, a journey node's `type`, `codeBlockIds`, `diffCodeBlockIds` and `children`, the `codeBlockId` of a trigger label, a `ring`, an edge, a `range`, a waypoint's `category`, the ids that link a waypoint to its nodes. A segment, a node, an edge, a file or a waypoint is never added, removed or reordered. A snapshot that is wrong there is fixed in the test, the case repository or `packages/codegraph`, and generated again.
- **A snapshot is never created or laid out by hand.** It is generated by running the case: `nx run playground-fixtures:snapshot`.
- **An update starts from scratch.** To update a fixture, delete its snapshot and generate it again, then write every written part anew from the code. To fill in a new fixture, write what is missing and leave the rest.
- **The instructions are never changed to fit what was written.**

The context is what a reviewer needs to know about the change before reading its codegraph. It is written from `context.md`, like every other written part, and so has the three parts that file asks for:

- **An opening paragraph.** Why anyone should care about the change, with no identifier, path or link.
- **`## Overview`.** What changes from outside the code, one scenario per line: a bold **When**, the situation, a bold **then**, what can be observed. A scenario where a reader expects a change and there is none says "nothing changes".
- **`## Implementation`.** What changed inside the code, grouped by the file or directory it lives in, in the order the walkthrough reads the files. One line per change in the diffs, the verb first.

Write it from the diffs and the case repository, never from the codegraph: the context says what the change is, and the codegraph is what was generated from it. The scenarios of the Overview are what let a reader see at once when the two disagree.

A snapshot whose written parts are empty is a draft: every node has only the name of its declaration, no waypoint has a reading, and its fixture is a review artifact still being drafted.

### What a case compares

`expectCaseSnapshot(codegraph)` compares what the codegraph generates, and nothing an agent writes:

1. It reads the committed snapshot of the case.
2. It carries the written parts of that snapshot over to the codegraph it was handed: a segment by its place, a journey node by `id` at any depth, a trigger label by its `codeBlockId`, a blast file by `path`, a file by `path`, a waypoint by `declaration`.
3. It compares the result with the committed file.

So rewording a context, a label or a reading never fails a case, and a change in a node, an edge, a ring, a line range or anything else that is generated always does. `nx run playground-fixtures:snapshot` rewrites what is generated and keeps what is written. What was written for a node, a file or a waypoint the codegraph no longer has is dropped by that rewrite, and shows in `git diff`.

## A test holds the change

A test holds what is handed to the codegraph, and nothing that comes out of a review: its title and its diffs. A reader sees what changed without leaving the test, and reads what was made of it in the snapshot.

- **Do not lift a diff into a constant.** `HELD_STOCK_DIFF` at the top of the file sends the reader away from the test to find out what it tests, and nothing is gained: a diff belongs to one case and is never used by another.
- **Two cases that need the same change each write it out.** A case that builds on another's change repeats that diff and adds its own.
- **Only what every case of the kind uses is shared**: `REPO_PATH`, `CASE_REF` and `openRepository`, declared once at the top of the file.
- **Nothing written goes in a test.** No context, no label, no reading. They are in the snapshot.

## Reading a snapshot

A snapshot is JSON with four fields. `title` is the title of the case, as written in its `it`. `context` is the context of the case, one line of Markdown per entry, so it reads line by line in the file and in `git diff`. `diff` is the diffs of the case, joined, one line per entry: whatever renders the snapshot marks the changed lines from it. `codegraph` is the result of `buildBranchCodegraph` with the written parts in it, in which a `Map` is written as the record of its entries. It has one entry in `segments` per segment of the change: the entry segments and the shared segment of each group of code blocks.

| Field | What to check |
|---|---|
| `title` | The written title of the segment, or `null` while nothing is written. |
| `kind` | `entry` for a line of change, `shared` for the changed files several lines of change have in common. |
| `importGraph` | The files the change reaches through imports, each with `diffType`, `importedBy` and `importsTo`. A file you expect and do not see means an import was not resolved. |
| `journeyFlowDiagram` | The diagram in its stored form: `journeyNodes`, each with its `type`, the ids of its blocks, the nodes inside it and its trigger labels, and `journeyNodeEdges`. A block id leads to a block of the case's `code-blocks/` snapshot. `null` when the change touches no function, class or value, and on the shared segment. |
| `blastRadiusDiagram` | The changed files of the segment and the files that use what changed in them, each with its `diffType`, its `impactType` and its `impactReason`, and one edge per use between two of them. `null` on an entry segment nothing outside the change uses, when the change has several segments. |
| `codeWalkthrough` | One File Section per changed file, one waypoint per changed declaration, each with its `category` and the ids of its nodes in the two diagrams. |
| `codeReferences` | For each file of the Code Walkthrough and of the journey nodes: every name used in it, with its line and columns, the `path` and `lines` of its definition, and `isLibrary` for a name whose import statement is all there is to show. |

Read the context first, then the two diagrams and the walkthrough against it. When one of them is wrong, read the blocks of the case in `test-cases/<kind>/code-blocks/<snapshot name>.code-blocks.json`.

## Reading the snapshots from code

`src/index.ts` is what another project imports, as `@flightplan/playground-fixtures`. It reads the committed snapshots from disk and never runs a case, so what it returns is as fresh as the last `nx run playground-fixtures:snapshot`. Every function takes `testCasesPath`, the path of a folder laid out as `test-cases/` is, as its first argument.

| Function | Returns |
|---|---|
| `getAllFixtureCases(testCasesPath)` | The names of the folders under `test-cases/`, in order: `["python-flask", "react-spa-query-zustand", "typescript", "vue-spa-query-pinia"]` |
| `getFixtureRepository(testCasesPath, caseName)` | That folder as a repository the index page can list: a local git repository named after the folder, with one pull request review target per snapshot, in order. The title of a target is the title of its snapshot, its branch is the snapshot's file name, its number is its place in the list, and its author and date are mocked constants. It refuses a name that cannot be a folder name with `UnknownFixtureCaseError` |
| `getAllReviewArtifactFixturesByCase(testCasesPath, caseName)` | The names of the snapshots of that folder, in order, each as `<folder>/<snapshot file name without .snapshot.json>`. An empty list for a folder that does not exist or has no snapshot |
| `getReviewArtifactFixture(testCasesPath, fixtureName)` | That snapshot as a `ReviewArtifact`, the shape a stored review has. It takes a name as the function above returns it, and refuses any other with `UnknownFixtureError` |

All four are asynchronous. In their names a fixture case is a kind, and a review artifact fixture is the snapshot of one case.

```ts
const [firstCase] = await getAllFixtureCases(testCasesPath)
const repository = await getFixtureRepository(testCasesPath, firstCase)
const [firstFixture] = await getAllReviewArtifactFixturesByCase(testCasesPath, firstCase)
const fixture = await getReviewArtifactFixture(testCasesPath, firstFixture)
```

The functions read `<kind>/snapshots/*.snapshot.json` and `<kind>/repo/` under the path they are given. The development build of `apps/backend` passes the path of `test-cases/` in the workspace, and the index page lists one kind at a time in its Fixtures section, as a repository. A production build does not have the code that reads them.

### A snapshot as a review artifact

`getReviewArtifactFixture` builds the artifact from the snapshot and the case repository, and refuses a result `reviewArtifactSchema` does not accept.

| Field of the artifact | Comes from |
|---|---|
| `title` | The snapshot's `title` |
| `status` | `complete` when every segment of the snapshot has a title, `drafting` otherwise |
| `commit` | A mocked constant, forty `2`s, the head commit of the case adapter |
| `isSegmented` | Whether the codegraph has more than one segment |
| `changedPaths` | The paths the snapshot's `diff` changes, in order |
| `sources` | One per changed path: the file of `repo/` with the diff applied, each line marked from the diff, the line range of every waypoint in it under `declarations`, and the names it uses with where each is defined under `references`. Then one per file that a code view of a journey node shows or a reference leads to and the change did not touch, with every line as it is at the head commit |
| A segment's `id` | A mocked constant, `fixture-segment-<place>` |
| A segment's `title` | The segment's title, or an empty text while nothing is written |
| A segment's `changedPaths` | The files of its `importGraph` that have a `diffType` |
| A segment's `context` | The snapshot's `context`, the same in every segment: a case has one context |
| `journey`, `blast` | The segment's `blastRadiusDiagram` as it is, and its `journeyFlowDiagram` linked to the groups of the case's `code-blocks/` snapshot, so every block id is the block itself. `journey` is `null` when there is no journey |
| `walkthrough` | The segment's `codeWalkthrough`, without what only the codegraph keeps on a waypoint: `range`, `category` and the ids of its diagram nodes |

## Rules

- **Everything under `test-cases/` is skipped by ESLint and TypeScript.** That is the case repositories, the snapshots and the test files themselves: a test file is mostly diff text and prose, and is checked by running it. Vitest runs the test files and nothing else in the folder.
- **`repo/` is data, not code.** Vitest and Nx skip `test-cases/*/repo/` too. A case repository may hold code that does not compile, imports that do not resolve and a `package.json` whose dependencies are not installed.
- **A case repository never changes for one case.** A file added to `repo/` is seen by every case of the kind and can change their snapshots. Put what only one case needs in that case's diff.
- **`src/` never imports `test-cases/` or `test-setup/`.** Lint rejects it. It reads the snapshots as files.
- **A case holds its own diffs.** They are written inside the `it`, never as constants or in another file. What an agent writes is in the snapshot, never in a test.
- **A case tests `buildBranchCodegraph`, nothing smaller.** The behaviour of one function belongs in the `__tests__/` folder beside it.
- **No real git, network or clock.** A case that needs one is not a case.

## Commands

| Command | What it does |
|---|---|
| `nx test playground-fixtures` | Runs the specs of `src/` and `test-setup/` and every case, and fails a case whose result differs from its snapshot |
| `nx run playground-fixtures:snapshot` | Runs the cases only and rewrites their snapshots |
| `nx run-many -t eslint:lint typecheck test -p playground-fixtures` | The full check before a change is done. Lint and typecheck cover `src/` and `test-setup/`; only `test` covers the cases |

Rewrite a snapshot only after an intended change in behaviour, and read the difference in `git diff` before committing it: a rewritten snapshot accepts whatever the code now produces. A rewrite keeps the written parts of everything the codegraph still has.
