# apps/backend

The Fastify 5 server and imperative shell: HTTP, tRPC transport, MCP transport and I/O adapters (git, file system, forges). Read [architecture](../../docs/agents/architecture.md), [functional programming](../../docs/agents/functional-programming.md) and [fastify](../../docs/agents/fastify.md) before changing anything here.

## Rules

- **All logic lives on the backend side**, and the frontend only renders. Responses are display-ready: already filtered, sorted, grouped and formatted.
- **Thin shell.** Domain decisions are pure functions (in `packages/api`, or in pure modules here). Transports and adapters gather input, call them and apply the result.
- `main.ts` is the only file that reads `process.env` and calls `listen`. `buildServer()` builds the instance for both production and tests.
- Register plugins explicitly in `buildServer`. No `@fastify/autoload`, because it breaks in the esbuild bundle.
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
  trpc.ts                      mounts the appRouter from @flight-plan/api at /api/trpc
  mcp.ts, mcp/<tool>/index.ts  stateless MCP endpoint at POST /mcp and its tools
  api/<endpoint>/index.ts      raw Fastify routes that tRPC cannot serve
  utils/<util>/                I/O adapters, with __tests__/
```

## Verify

- `pnpm nx run-many -t eslint:lint typecheck test -p backend api`. If `typecheck` targets are still missing, add them.
- Test with `server.inject(...)` on `buildServer()`, and never bind a port in tests.
- For a behaviour change, run `pnpm dev` and exercise the endpoint (tRPC through `/api/trpc/...`, MCP with a `tools/call` request) as well as the tests.
