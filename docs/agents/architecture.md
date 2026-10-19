# Architecture

Flight Plan is split into a backend that owns all logic and a frontend that renders what the backend returns. This split is the most important rule in the codebase. When code could live on either side, it goes in the backend.

## The two sides

| Side | Projects | Job |
|---|---|---|
| Backend | `apps/backend` | Every operation and every decision: reading git and forges, building the codegraph, validating input, filtering, sorting, grouping, computing flags and status, and shaping data for display. |
| Frontend | `apps/frontend`, `packages/ui` | Rendering the data the backend returns, and passing user intent (clicks, input, navigation) back to the backend. |

### What the frontend may do

- Hold **view state** that only affects presentation: whether a panel is open, the active tab, hover and focus, the current text in an input, scroll position.
- Map backend data to JSX, pick a component from a discriminant field the backend provides (`kind`, `status`), and pick a CSS class variant from such a field.
- Call backend queries and mutations with the user's input, and render loading, error and empty states for them.
- Put URL state (route params, search params) into those calls.

### What the frontend must not do

- Filter, sort, group, search, paginate, count or aggregate collections.
- Derive business values: severities, totals, diff statistics, "is this reviewed", "which file is changed", and anything like that.
- Validate input beyond what the input element does natively. The backend validates, and the frontend renders the errors it returns.
- Format domain values (dates, paths, counts, labels). The backend sends display-ready strings.
- Hold domain state that the backend should own, or cache it outside TanStack Query.

If a component needs a value that is not in the response, change the backend response. Do not compute it in the component.

The published copy of a Flight Plan is the one exception. It has no backend, so it works out what the reviewer's marks make reviewed in the browser, and only through `packages/reviewed-marks`, the same calculation the backend runs (see [Reviewed marks package structure](#reviewed-marks-package-structure)).

**Example.** A review page shows files grouped by directory with a "3 findings" badge. The backend returns `{ groups: [{ label: "apps/backend/src", files: [{ path, findingCountLabel: "3 findings", hasFindings: true }] }] }`. The component maps over `groups` and `files` and renders what it gets. It never calls `groupBy`, `filter` or `.length`.

## Frontend structure

The frontend follows TanStack Router's file-based routing. A route file is the page: it declares the URL with `createFileRoute`, prefetches data in its `loader`, and holds the page component.

```
apps/frontend/src/routes/
  __root.tsx                      the root layout
  index.tsx                       the page at /
  pr-reviews/
    $repoName/
      $branchId.tsx               the page at /pr-reviews/:repoName/:branchId
      -components/                components that belong to this page only
        <ComponentName>/
          index.tsx
          __tests__/
      __tests__/                  tests for the route files in this folder
```

- File and folder names follow TanStack Router: `__root.tsx`, `index.tsx`, `$param` segments, `_pathless` layouts and `(group)` folders. The router plugin generates `routeTree.gen.ts` from them.
- A name that starts with `-` is left out of the route tree. `-components/` holds the pieces of the page next to it. `__tests__/` is left out too, through `routeFileIgnorePattern` in `vite.config.mts`.
- A route file is the only place that talks to the backend. It passes plain data and callbacks down as props.
- `apps/frontend` never holds shared or global components. Anything used by two pages moves to `packages/ui`.

## UI package structure

```
packages/ui/src/
  components/
    blocks/                       shadcn building blocks (button, dialog, ...), added through the shadcn CLI
    <ComponentName>/              shared composed components, for example CodeLink or BlastDiagram
      index.tsx
      __tests__/
  lib/
  styles/
```

- `components/blocks/` holds shadcn primitives. Add them with `cd packages/ui && pnpm dlx shadcn@latest add <component>`. The CLI writes named exports, so make the component the file's default export and fix the imports between blocks.
- `components/<ComponentName>/` holds reusable components composed from primitives.
- Every file under `components/` default-exports its component. Other exports, such as variants or the parts of a compound component (`DialogContent`), are named.
- Import a component by its path under `src/components/`: `import Button from "@flightplan/ui/blocks/button"`, `import CodeLink from "@flightplan/ui/CodeLink"`. Helpers come from `@flightplan/ui/lib/<module>`. There is no package root and no barrel file.
- Everything in `packages/ui` is presentational. It receives all data and callbacks through props, and it never calls an API, reads the router or touches TanStack Query.

## Backend structure

```
apps/backend/src/
  procedures/
    context.ts                     ProcedureContext and the mock context
    <procedure>/                   one procedure, for example list-repositories — the logic, transport-neutral
      index.ts                     (input, context) => result; returns failure as data, never throws a transport error
      __tests__/
      utils/
        schemas.ts                 zod input and output schemas
        <calculation>.ts           pure logic only this procedure uses
        __tests__/
  <feature>/                       a domain feature, for example review
    <calculation>.ts               domain types, store interfaces and pure logic shared across procedures
    __tests__/
  server/
    trpc/
      trpc.ts                      createRouter and publicProcedure
      router.ts                    root appRouter, composed from routes/, and the AppRouter type
      plugin.ts                    mounts the appRouter at /api/trpc
      routes/<procedure>/index.ts  validates input, calls the procedure, maps its result to a TRPCError on failure
    mcp/
      plugin.ts                    the stateless MCP endpoint at POST /mcp
      tools/<tool>/index.ts        validates input, calls the procedure, shapes the MCP tool result
    api/routes/<endpoint>/index.ts Fastify routes that are not tRPC
  utils/<util>/                    I/O adapters (git, file system, forges)
    __tests__/
  server.ts                        buildServer: registers plugins, tRPC and MCP
  main.ts                          reads the environment and the arguments, starts the server
```

- All logic lives in `apps/backend`, as procedures. Each procedure's `utils/` and the `<feature>/` modules it shares with others are the functional core: pure calculations over plain data. `server/trpc`, `server/mcp`, `server/api` and `utils/` adapters are the shell.
- **A procedure is created for every piece of logic**, even where only one transport calls it today. This is what keeps tRPC, MCP and raw routes from duplicating a check or drifting apart as each one changes. The transport layer under `server/` only validates input against the procedure's schema, calls the procedure, and translates its result into that transport's shape.
- Procedures receive I/O (git, file system, forge clients) through `ProcedureContext`, which `buildServer` provides. `procedures/context.ts` names each piece of I/O as an interface. While a feature has no real adapter, `createMockProcedureContext` fills its interface with an in-memory store seeded from the feature's `mock-<things>.ts`, and the response carries a notice that says the data is sample data.
- The frontend reads the `AppRouter` type through the alias `@flightplan/backend/router` in `tsconfig.base.json`, pointed at `apps/backend/src/server/trpc/router.ts`. It is the only backend module the frontend may import, and only with `import type`.

## Configurations package structure

```
packages/configurations/src/
  index.ts                        the entry: every field an agent can ask about with its public path, the presets and their section switches, and the shapes below
  artifact/                       the review artifact's types, its zod schema with each field's configuration registered on it, the registry and the catalog read from it, and the values they share
  bands/                          the schemas of what the review page renders: the diagrams, the Code Walkthrough, prose, code lines
  system-instructions/            <field>.md, what each field is; the same for every configuration
  default-configurations/
    <preset>/                     <field>.md and <field>.<option>.md, how that preset writes each editable field
  __tests__/
```

- The package holds shapes and data only: the artifact's shape, the band schemas, the catalog and the Markdown it names. Its one function is the walk that reads the catalog out of the schema. Building a band is `packages/codegraph` code, and reading the files and resolving a field for a configuration are backend code (`utils/instruction-file-reader/` and `procedures/get-instructions/`).
- A field's configuration is registered on the field's own Zod schema in `artifact/artifact-schema.ts`, with `.register(configurations, { … })`: its version, whether it is editable, the file that describes it, an example value, and for an editable field the title and description the settings screen shows and the file of its default instruction. The catalog is read from that registry, never kept as a list beside the schema.
- A file is named after its field's path in the catalog (`walkthrough.files.waypoints.reading.md`), and that path is the field's place inside a segment. A test fails when a catalog entry has no file or a file has no entry.
- A preset folder holds what that preset writes differently. A field it does not write is read from `standard/`.
- The backend build copies the Markdown beside the server, in `configurations/`, and the server reads it once.

## Codegraph package structure

```
packages/codegraph/
  src/
    index.ts                      the package's only entry: the functions and types the backend imports
    import-graph/ ast-graph/      the files a change connects and what each one declares and uses
    trace-diagram/ blast-diagram/ code-walkthrough/   generate the two diagrams and the walkthrough of a segment
    scaffold/                     assembles the first review artifact from the segments of a codegraph, the diff and the files
    trace/ blast/ diagram/      lay out and build the two diagram bands
    walkthrough/ code/ prose/     build the Code Walkthrough band, code links and prose
```

- The package is consumed as source through the alias `@flightplan/codegraph`. It has no build step.
- The builders in `trace/`, `blast/`, `walkthrough/`, `code/` and `prose/` turn a review artifact into the bands the page renders. They take the artifact's shapes and the band schemas from `packages/configurations`, and receive what only the backend knows (forge links, pinned lines, highlighted code) as arguments.
- `buildCodegraph` in `index.ts` reads a change through git-forge and builds one segment per connected group of files. Everything under it is calculations over what it read. The rules are in [packages/codegraph/AGENTS.md](../../packages/codegraph/AGENTS.md).
- Read [codegraph](../vocabulary/codegraph.md) before changing anything in it.

## Reviewed marks package structure

```
packages/reviewed-marks/src/
  index.ts                        the package's only entry
  marks.ts                        ReviewedMarks, its schema, and reading marks from anything
  reviewable-file.ts              the outline of what a file holds to mark: its waypoints and root code blocks, each with a fingerprint
  reviewed-subject.ts             what a mark is put on: a waypoint, a file or a root code block
  reviewed-state.ts               what the marks make reviewed in a file
  reviewed-change.ts              the marks after one is put on or taken off
  reviewed-segment.ts             a segment's Code Walkthrough and Trace Diagram bands with the marks applied
  labels.ts                       the words both sides draw: the Reviewed toggle, step positions, waypoint mark labels, the empty message
```

- The package is the one module the backend and the published copy share. `packages/codegraph` builds the outline of each file from the artifact, with its fingerprints, and asks `reviewedStateOf` what is reviewed. The backend's `set-reviewed` changes the marks with `applyReviewedChange`. The published copy reads the outline from the published review, keeps the marks in `localStorage`, and draws each segment through `reviewSegment`, `withReviewedWalkthrough` and `withReviewedTrace`.
- It holds calculations over plain data and nothing else: no I/O, no `node:` module, no browser API and no React, so it runs on both sides. A fingerprint is computed by `packages/codegraph` and arrives in the outline.
- It is consumed as source through the alias `@flightplan/reviewed-marks`. It has no build step, and it takes only the shapes of the bands from `packages/configurations`.

## Git forge package structure

```
packages/git-forge/
  src/
    index.ts                      the package's only entry: the functions and types the backend imports
    git-adapter/                  the GitAdapter interface, the plain git adapter and one adapter per forge
      custom-providers/           the forge clients the adapters call, and the schemas of their raw responses
      helpers/                    assembling and selecting an adapter, the remote, REST, diffs, permalinks, people
```

- The package is consumed as source through the alias `@flightplan/git-forge`. It has no build step.
- It knows git and forges only. Choosing a forge for a repository, credentials, CLI probing and everything a page shows are backend code. Its rules are in [packages/git-forge/AGENTS.md](../../packages/git-forge/AGENTS.md).
- Read [forge](../vocabulary/forge.md) before changing anything in it.

## Imports and TypeScript projects

- Inside a project, import from a parent folder through its base path, `@/`, which points at that project's `src/`: `import { useTRPC } from "@/trpc"`, `import Button from "@/components/blocks/button"`. Lint rejects `../`. Siblings may use `./`.
- Across projects, use the workspace aliases: `@flightplan/ui/<path>` for components, `@flightplan/ui/lib/<module>` for helpers, and `import type { AppRouter } from "@flightplan/backend/router"`.
- Every tsconfig is a composite TypeScript project, and `typecheck` runs `tsc --build`. `apps/frontend/tsconfig.app.json` references `apps/backend/tsconfig.app.json`, `packages/ui/tsconfig.lib.json` and `packages/reviewed-marks/tsconfig.lib.json`, so the frontend reads their built declarations (in `dist/out-tsc/`) and each project's `@/` is resolved by that project. When the frontend starts importing another project, add it to the `references` of `tsconfig.app.json` and `tsconfig.spec.json`. The backend references `packages/configurations/tsconfig.lib.json`, `packages/codegraph/tsconfig.lib.json`, `packages/git-forge/tsconfig.lib.json` and `packages/reviewed-marks/tsconfig.lib.json` the same way, and its esbuild build type-checks with `apps/backend/tsconfig.build.json`, which includes the four packages' sources because the build does not follow project references. In that one file `@/` lists the backend's `src/` first and the packages' `src/` after it, so a package's own `@/` imports resolve inside the bundle. A top-level folder name must therefore not be shared between the backend's `src/` and a package's `src/`.
- Vite and Vitest resolve the same aliases through `vite-tsconfig-paths`, configured to read `tsconfig.app.json`, `tsconfig.lib.json` and `tsconfig.spec.json`.

## Dependency rules

- `apps/frontend` → `packages/ui`, `packages/reviewed-marks`, and `import type { AppRouter }` from `@flightplan/backend/router`.
- `packages/ui` → nothing in the workspace except its own modules.
- `apps/backend` → `packages/configurations`, `packages/codegraph`, `packages/git-forge` and `packages/reviewed-marks`, and no browser packages (React, TanStack, Base UI, lucide). In a development build only, it also reads `tools/playground-fixtures` (see [apps/backend/AGENTS.md](../../apps/backend/AGENTS.md)).
- `tools/playground-fixtures` → `packages/configurations`, `packages/codegraph` and `packages/git-forge`.
- `packages/configurations` → nothing in the workspace.
- `packages/codegraph` → `packages/configurations`, `packages/git-forge` and `packages/reviewed-marks`.
- `packages/reviewed-marks` → `packages/configurations`.
- `packages/git-forge` → nothing in the workspace.
- No project imports from `src/`.

`@nx/enforce-module-boundaries` in `eslint.base.config.ts` enforces these rules through the project tags `type:app`, `type:ui`, `type:configuration`, `type:codegraph`, `type:git-forge`, `type:reviewed-marks`, `type:fixtures`, `platform:browser` and `platform:node`, and bans server packages from browser projects. A new project needs the right tags in its `project.json`. `apps/frontend/eslint.config.ts` allows the one type import from `@flightplan/backend/router` and rejects value imports from it. Do not weaken these rules to get an import through. Move the code instead.
