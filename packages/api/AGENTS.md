# packages/api

The tRPC contract and the domain core: routers, zod schemas and the pure functions that hold Flight Plan's business logic. The router lives in a library because Nx forbids one app importing another, and the frontend needs `type AppRouter`. Read [architecture](../../docs/agents/architecture.md), [functional programming](../../docs/agents/functional-programming.md) and [fastify](../../docs/agents/fastify.md) before changing anything here.

## Rules

- **Server-only code.** The frontend imports only `type AppRouter` from here. Nothing in this package may assume it runs in a browser.
- **Pure core.** Domain modules are calculations over immutable data. I/O (git, file system, forge clients, clock) reaches procedures through the tRPC context built in `apps/backend`. This package does not import `node:fs`, `node:child_process` or network clients directly.
- **Organise by feature**: `src/<feature>/router.ts`, `src/<feature>/schemas.ts`, `src/<feature>/<calculation>.ts` and `src/<feature>/__tests__/`. The root `router.ts` composes the feature routers.
- **Procedures are thin**: validate with zod `.input()`, call the core, and return display-ready data checked by `.output()`.
- Schemas are the single source of truth. Types come from `z.infer`, never hand-written duplicates.
- Procedure names are `camelCase` and grouped by feature (`review.get`, `review.files`). They are public API, so name them with care.

## Verify

- `pnpm nx run-many -t eslint:lint typecheck test -p api backend`. This package currently has only `eslint:lint`, so add `typecheck` and `test` targets the first time you touch it.
- Unit-test calculations with plain input and output. Test procedures with `appRouter.createCaller(context)` and in-memory fakes.
