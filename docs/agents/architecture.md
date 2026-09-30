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
- Derive business values: severities, totals, diff statistics, "is this reviewed", "which node is the epicenter", and anything like that.
- Validate input beyond what the input element does natively. The backend validates, and the frontend renders the errors it returns.
- Format domain values (dates, paths, counts, labels). The backend sends display-ready strings.
- Hold domain state that the backend should own, or cache it outside TanStack Query.

If a component needs a value that is not in the response, change the backend response. Do not compute it in the component.

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
  <feature>/                      a domain feature, for example review or codegraph
    router.ts                     tRPC procedures: validate input, call the core, return display-ready output
    schemas.ts                    zod input and output schemas
    <calculation>.ts              pure domain logic
    __tests__/
  trpc/
    procedures.ts                 createRouter and publicProcedure
    router.ts                     root appRouter and the AppRouter type
    plugin.ts                     mounts the appRouter at /api/trpc
  api/<endpoint>/index.ts         Fastify routes that are not tRPC
  mcp/<tool>/index.ts             MCP tools, each a thin adapter over the same core
  utils/<util>/                   I/O adapters (git, file system, forges)
    __tests__/
  server.ts                       buildServer: registers plugins, tRPC and MCP
  main.ts                         reads the environment, starts the server
```

- All logic lives in `apps/backend`. Feature modules are the functional core: pure calculations over plain data. Transports and `utils/` adapters are the shell.
- Procedures receive I/O (git, file system, forge clients) through the tRPC context, which `buildServer` provides.
- The frontend reads the `AppRouter` type through the alias `@flightplan/backend/router` in `tsconfig.base.json`. It is the only backend module the frontend may import, and only with `import type`.
- tRPC procedures and MCP tools are transports. They validate, call the same domain functions and translate the result. Logic lives once, in the core.

## Imports and TypeScript projects

- Inside a project, import from a parent folder through its base path, `@/`, which points at that project's `src/`: `import { useTRPC } from "@/trpc"`, `import Button from "@/components/blocks/button"`. Lint rejects `../`. Siblings may use `./`.
- Across projects, use the workspace aliases: `@flightplan/ui/<path>` for components, `@flightplan/ui/lib/<module>` for helpers, and `import type { AppRouter } from "@flightplan/backend/router"`.
- Every tsconfig is a composite TypeScript project, and `typecheck` runs `tsc --build`. `apps/frontend/tsconfig.app.json` references `apps/backend/tsconfig.app.json` and `packages/ui/tsconfig.lib.json`, so the frontend reads their built declarations (in `dist/out-tsc/`) and each project's `@/` is resolved by that project. When the frontend starts importing another project, add it to the `references` of `tsconfig.app.json` and `tsconfig.spec.json`.
- Vite and Vitest resolve the same aliases through `vite-tsconfig-paths`, configured to read `tsconfig.app.json`, `tsconfig.lib.json` and `tsconfig.spec.json`.

## Dependency rules

- `apps/frontend` → `packages/ui`, and `import type { AppRouter }` from `@flightplan/backend/router`.
- `packages/ui` → nothing in the workspace except its own modules.
- `apps/backend` → nothing in the workspace, and no browser packages (React, TanStack, Base UI, lucide).
- No project imports from `src/`.

`@nx/enforce-module-boundaries` in `eslint.base.config.ts` enforces these rules through the project tags `type:app`, `type:ui`, `platform:browser` and `platform:node`, and bans server packages from browser projects. A new project needs the right tags in its `project.json`. `apps/frontend/eslint.config.ts` allows the one type import from `@flightplan/backend/router` and rejects value imports from it. Do not weaken these rules to get an import through. Move the code instead.
