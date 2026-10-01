# apps/backend

The Fastify 5 server and imperative shell: HTTP, tRPC transport, MCP transport and I/O adapters (git, file system, forges). Read [architecture](../../docs/agents/architecture.md), [functional programming](../../docs/agents/functional-programming.md) and [fastify](../../docs/agents/fastify.md) before changing anything here.

## Rules

- **All logic lives on the backend side**, and the frontend only renders. Responses are display-ready: already filtered, sorted, grouped and formatted.
- **Thin shell.** Domain decisions are pure functions: the ones a single procedure needs in its `trpc/<procedure>/utils/`, the ones several transports share in feature modules (`src/<feature>/`). Transports and adapters gather input, call them and apply the result.
- **One folder per tRPC procedure.** `trpc/<procedure>/index.ts` exports the procedure as `<procedure>Procedure`, and its schemas and calculations live in `trpc/<procedure>/utils/`. `trpc/router.ts` only composes the procedures into the `appRouter`.
- `main.ts` is the only file that reads `process.env` and calls `listen`. `buildServer()` builds the instance for both production and tests.
- Register plugins explicitly in `buildServer`. No `@fastify/autoload`, because it breaks in the esbuild bundle.
- **Procedures reach I/O through the tRPC context.** `TrpcContext` in `trpc/context.ts` holds interfaces such as `RepositoryStore`, the clock and the notice about the data. `createMockTrpcContext` fills them with in-memory stores seeded from a feature's `mock-<things>.ts`. Mocked data lives behind those interfaces, never in a procedure body, so real adapters replace the stores and the procedures stay as they are.
- tRPC procedures and MCP tools share the same core functions. Logic is never duplicated between transports.
- Validate every input with zod, and give every raw route a full schema including `response`.
- No request data in module-level state. Close every resource in `onClose`.
- Use `request.log` and `server.log`, never `console`.
- File-system paths from requests or MCP calls must stay inside the repository root. Run subprocesses with argument arrays only.

## Layout

```
src/
  main.ts                      reads config, builds the server, listens
  server.ts                    buildServer: plugins, tRPC, MCP
  config.ts                    pure environment parser
  trpc/procedures.ts           createRouter and publicProcedure
  trpc/router.ts               root appRouter and the AppRouter type the frontend imports
  trpc/plugin.ts               mounts the appRouter at /api/trpc
  trpc/context.ts              TrpcContext: the I/O the procedures read through, and the mock context
  trpc/<procedure>/index.ts    one tRPC procedure, with __tests__/
  trpc/<procedure>/utils/      schemas.ts and the pure modules only this procedure uses, with __tests__/
  <feature>/                   domain types, store interfaces and pure modules shared across procedures and transports, with __tests__/
  mcp.ts, mcp/<tool>/index.ts  stateless MCP endpoint at POST /mcp and its tools
  api/<endpoint>/index.ts      raw Fastify routes that tRPC cannot serve
  utils/<util>/                I/O adapters, with __tests__/
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p backend frontend` (the frontend type-checks against `AppRouter`)
- Test with `server.inject(...)` on `buildServer()`, and never bind a port in tests.
- For a behaviour change, run `pnpm dev` and exercise the endpoint (tRPC through `/api/trpc/...`, MCP with a `tools/call` request) as well as the tests.
