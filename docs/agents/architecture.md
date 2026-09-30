# Architecture

Flight Plan is split into a backend that owns all logic and a frontend that renders what the backend returns. This split is the most important rule in the codebase. When code could live on either side, it goes in the backend.

## The two sides

| Side | Projects | Job |
|---|---|---|
| Backend | `apps/backend`, `packages/api` | Every operation and every decision: reading git and forges, building the codegraph, validating input, filtering, sorting, grouping, computing flags and status, and shaping data for display. |
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

```
apps/frontend/src/
  routes/                         TanStack Router file routes: bind a URL to a page, nothing else
  pages/
    <page-name>/
      index.tsx                   the page: reads route params, calls queries, renders components
      __tests__/
      components/
        <ComponentName>/
          index.tsx
          __tests__/
    <parent-page>/
      <child-page>/
        index.tsx
```

- `routes/` files only call `createFileRoute` and point at a page from `pages/`. The TanStack Router plugin generates `routeTree.gen.ts` from them.
- A page is the only place that talks to the backend. It passes plain data and callbacks down as props.
- `pages/<page>/components/` breaks a large page into pieces. These components belong to that page only.
- `apps/frontend` never holds shared or global components. Anything used by two pages moves to `packages/ui`.

## UI package structure

```
packages/ui/src/
  components/
    ui/                           shadcn building blocks (button, dialog, ...), added through the shadcn CLI
    <ComponentName>/              shared composed components, for example CodeLink or BlastDiagram
      index.tsx
      __tests__/
  lib/
  styles/
```

- `components/ui/` holds shadcn primitives. Add them with `cd packages/ui && pnpm dlx shadcn@latest add <component>`.
- `components/<ComponentName>/` holds reusable components composed from primitives.
- Everything in `packages/ui` is presentational. It receives all data and callbacks through props, and it never calls an API, reads the router or touches TanStack Query.

## Backend structure

```
packages/api/src/                 tRPC contract and domain core
  <feature>/
    router.ts                     procedures: validate input, call the core, return display-ready output
    schemas.ts                    zod input and output schemas
    <calculation>.ts              pure domain logic
    __tests__/
  router.ts                       root appRouter
apps/backend/src/                 imperative shell
  api/<endpoint>/index.ts         Fastify routes that are not tRPC
  mcp/<tool>/index.ts             MCP tools, each a thin adapter over the same core
  utils/<util>/                   I/O adapters (git, file system, forges)
    __tests__/
  server.ts                       buildServer: registers plugins, tRPC and MCP
  main.ts                         reads the environment, starts the server
```

- The tRPC router lives in `packages/api` because Nx forbids one app importing another, and the frontend needs `type AppRouter`.
- Procedures in `packages/api` stay pure where they can. They receive I/O (git, file system, forge clients) through the tRPC context, which `apps/backend` builds. They do not import Node I/O modules directly.
- tRPC procedures and MCP tools are transports. They validate, call the same domain functions and translate the result. Logic lives once, in the core.

## Dependency rules

- `apps/frontend` → `packages/ui`, and `import type` only from `@flight-plan/api`.
- `packages/ui` → nothing in the workspace except its own modules.
- `apps/backend` → `packages/api`.
- `packages/api` → no app, and nothing from `packages/ui`.
- No project imports from `src/`.

`@nx/enforce-module-boundaries` in `eslint.base.config.ts` enforces these rules. Do not weaken it to get an import through. Move the code instead.
