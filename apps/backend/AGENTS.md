# apps/backend

The Fastify 5 server and imperative shell: HTTP, tRPC transport, MCP transport and I/O adapters (git, file system, forges). Read [architecture](../../docs/agents/architecture.md), [functional programming](../../docs/agents/functional-programming.md) and [fastify](../../docs/agents/fastify.md) before changing anything here.

## Rules

- **All logic lives on the backend side**, and the frontend only renders. Responses are display-ready: already filtered, sorted, grouped and formatted.
- **Procedures hold the logic. Transports only validate and invoke.** Every piece of backend logic is a procedure in `procedures/<procedure>/`, whether tRPC, MCP or a raw route calls it, and even while only one transport calls it today — this is what keeps the transports from drifting apart or duplicating a check. `server/trpc/routes/<procedure>/`, `server/mcp/tools/<tool>/` and `server/api/routes/<endpoint>/` are wrappers: they validate the request with the procedure's zod schema, call the procedure, and translate its result into that transport's shape (an HTTP status, a `TRPCError`, an MCP error content block). A wrapper earns more than that only when the transport truly needs it — reshaping a response, fanning out to more than one procedure, mapping a procedure's result to that transport's error format — never business logic.
- **A procedure is a plain async function**, `(input, context) => result`, exported from `procedures/<procedure>/index.ts`. It returns data, including failure as a value (a discriminated union, a nullable result); it does not throw transport errors. The wrapper that called it decides what a given result means for its transport.
- `procedures/<procedure>/utils/` holds that procedure's own schemas and pure calculations, with `__tests__/` next to each. Logic more than one procedure needs moves to a `<feature>/` folder at `src/` root instead (domain types, store interfaces, shared calculations), never duplicated into two procedures' `utils/`.
- `main.ts` is the only file that reads `process.env` and calls `listen`. `buildServer()` builds the instance for both production and tests.
- Register plugins explicitly in `buildServer`. No `@fastify/autoload`, because it breaks in the esbuild bundle.
- **Procedures reach I/O through `ProcedureContext`.** `procedures/context.ts` names each piece of I/O as an interface, such as `RepositoryStore`, the clock and the notice about the data. `createMockProcedureContext` fills them with in-memory stores seeded from a feature's `mock-<things>.ts`. Mocked data lives behind those interfaces, never in a procedure body, so real adapters replace the stores and the procedures stay as they are. `createLocalProcedureContext` is the context `main.ts` runs with: it starts from the mock context and swaps in the real adapters from `utils/` that exist so far (the setup stored in the data directory, agent detection, agent installing).
- Validate every input with zod, and give every raw route a full schema including `response`.
- No request data in module-level state. Close every resource in `onClose`.
- Use `request.log` and `server.log`, never `console`.
- File-system paths from requests or MCP calls must stay inside the repository root. Run subprocesses with argument arrays only.

## Layout

```
src/
  main.ts                                reads config, builds the server, listens
  server.ts                               buildServer: plugins, tRPC, MCP
  config.ts                               pure environment parser
  procedures/
    context.ts                            ProcedureContext: the I/O procedures read through, and the mock context
    <procedure>/index.ts                  one procedure: the logic, transport-neutral, with __tests__/
    <procedure>/utils/                    schemas.ts and the pure modules only this procedure uses, with __tests__/
  <feature>/                              domain types, store interfaces and pure modules shared across procedures, with __tests__/
  server/
    trpc/trpc.ts                          createRouter and publicProcedure
    trpc/router.ts                        root appRouter, composed from routes/, and the AppRouter type the frontend imports
    trpc/plugin.ts                        mounts the appRouter at /api/trpc
    trpc/routes/<procedure>/index.ts      validates input, calls the procedure, maps its result to a TRPCError on failure
    mcp/plugin.ts                         the stateless MCP endpoint at POST /mcp
    mcp/tools/<tool>/index.ts             validates input, calls the procedure, shapes the MCP tool result
    api/routes/<endpoint>/index.ts        raw Fastify routes that tRPC cannot serve
  utils/<util>/                           I/O adapters, with __tests__/
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p backend frontend` (the frontend type-checks against `AppRouter`)
- Test each procedure directly in `procedures/<procedure>/__tests__/index.spec.ts`, with a context holding in-memory fakes. Test each transport wrapper too, but only for what the wrapper does: validation and error mapping.
- Test Fastify and MCP with `server.inject(...)` on `buildServer()`, and never bind a port in tests.
- For a behaviour change, run `pnpm dev` and exercise the endpoint (tRPC through `/api/trpc/...`, MCP with a `tools/call` request) as well as the tests.
