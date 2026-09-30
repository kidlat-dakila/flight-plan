# Fastify

Backend rules for `apps/backend`. They are adapted from Matteo Collina's Fastify best practices and fitted to Flight Plan's stack: Fastify 5, tRPC at `/api/trpc`, a stateless MCP endpoint at `POST /mcp`, zod for validation, Vitest for tests, and an esbuild bundle. Flight Plan is a local app that a user starts on their own machine, so it binds to localhost and reads the user's repositories.

Core principles: **encapsulation** through plugins, **validation at every boundary**, **async/await everywhere**, and **Fastify built-ins and official `@fastify/*` plugins** before other dependencies.

## Server composition

`buildServer(options)` in `server.ts` builds and returns the instance without listening. `main.ts` is the only file that reads the environment and calls `listen`. Tests call `buildServer()` and `inject`.

```ts
export const buildServer = async (options: FastifyServerOptions = {}): Promise<FastifyInstance> => {
  const server = Fastify({ maxParamLength: TRPC_BATCH_PARAM_LENGTH, ...options })
  await server.register(sensible)
  await registerTrpc(server)
  registerMcp(server)
  return server
}
```

- Register every plugin explicitly in `buildServer`. Do not use `@fastify/autoload`: it scans folders at runtime and breaks once esbuild bundles the backend.
- Register in dependency order and `await` each registration that later code depends on. `await server.ready()` before you inspect decorators.

## Plugins and encapsulation

- Every `register` call creates an encapsulated context. Decorators, hooks and plugins registered inside it are visible only to that context and its children.
- Wrap a plugin with `fastify-plugin` only when its decorators or hooks must be visible to the parent, for example a shared git client or config. Give it a `name` and declare `dependencies` so a wrong order fails at startup.
- Scope hooks to route groups by registering them inside the group's plugin, not globally.
- Use `prefix` on `register` to namespace route groups.
- Plugin options are typed and validated when the plugin loads. Throw immediately on invalid options.
- Every resource a plugin opens (watchers, child processes, worker pools, caches with timers) is closed in an `onClose` hook.

```ts
export const gitPlugin = fp(
  async (server: FastifyInstance, options: GitPluginOptions) => {
    const git = createGitClient(options)
    server.decorate("git", git)
    server.addHook("onClose", async () => {
      await git.dispose()
    })
  },
  { name: "git", fastify: "5.x" },
)
```

## Decorators

- Use decorators for process-wide services created once (git client, forge clients, config), never for mutable request data.
- Type every decorator through declaration merging on `FastifyInstance`, `FastifyRequest` or `FastifyReply`.
- Initialise request decorators with `null` (`server.decorateRequest("reviewer", null)`) and assign them in a hook. Never initialise one with an object or array, which would be shared by every request.
- Check required decorators with `hasDecorator`, or declare them in the plugin's `decorators` metadata.
- Decorated services are treated as immutable. Their methods may do I/O, but nothing reassigns or mutates them after startup.

## Routes and transports

- Most endpoints are **tRPC procedures** in `apps/backend/src/<feature>/router.ts`, merged into the root router in `src/trpc/router.ts`. Add a raw Fastify route in `apps/backend/src/api/<endpoint>/index.ts` only for what tRPC cannot do: file downloads, streaming, webhooks, static files.
- **MCP tools** live in `apps/backend/src/mcp/<tool>/index.ts`. Like procedures, they validate input, call the domain core and translate the result. The MCP endpoint is stateless: one `McpServer` and transport per request, and `GET` and `DELETE` return 405.
- Handlers are `async` and return the payload. Use `reply.code(...)` to set a status, and never mix `return` with `reply.send()` in the same handler.
- Organise raw routes by feature. The route file registers routes, and handlers call the core.

## Validation and serialization

Validate every input at the boundary and every output you serialize:

- **tRPC**: every procedure has a zod `.input()` schema, and an `.output()` schema for data leaving the backend.
- **MCP**: every tool declares a zod `inputSchema`.
- **Raw Fastify routes**: declare a full `schema` with `params`, `querystring`, `body`, `headers` and `response` for every status code you return. A response schema serializes with `fast-json-stringify` and strips fields you did not declare, which stops accidental data leaks.
- Reject unknown properties (`z.strictObject`, or `additionalProperties: false`).
- Share schemas: define them once in `apps/backend/src/<feature>/schemas.ts` and derive types with `z.infer`. Never write a type by hand that duplicates a schema.
- Build schemas at module load. Never compile schemas per request.
- Keep types simple. Prefer plain interfaces and inferred schema types over clever generics.

## Error handling

- Throw, do not return error objects. In procedures, throw `TRPCError` with the right `code`. In raw routes, use `@fastify/sensible` (`throw server.httpErrors.notFound("Review not found")`) or `reply.notFound(...)`.
- Create domain error types with `@fastify/error` (`createError("REVIEW_NOT_FOUND", "Review %s not found", 404)`) when the same error is thrown from several places.
- Wrap errors from outside (git, forge APIs, the file system) with context and keep the original as `cause`: `new ForgeRequestError(message, { cause: error })`.
- Set one error handler with `setErrorHandler`. It logs with `request.log.error({ err: error })`, maps validation errors to 400 with field details, and never sends stack traces or internal messages for 5xx responses.
- Use `Promise.allSettled` when some sources are optional, and return a partial result with the failures listed.
- Errors thrown in async hooks go to the error handler, just like handler errors.

## Hooks and the request lifecycle

Lifecycle order: `onRequest` → `preParsing` → `preValidation` → `preHandler` → handler → `preSerialization` → `onSend` → `onResponse`, plus `onError`, `onTimeout` and `onRequestAbort`. Application hooks: `onReady`, `onListen`, `onClose`, `preClose`, `onRoute` and `onRegister`.

- Hooks are always `async`. Do not use the `done` callback style.
- To stop processing in a hook, send the reply and `return reply`.
- Use route-level hooks (`preHandler: [requireRepository]`) for rules that apply to a few routes, and scoped hooks inside a plugin for a route group.
- Put checks in the earliest hook that has what it needs: authentication in `onRequest`, body-dependent checks in `preHandler`.

## Configuration

- Read the environment once, in `main.ts`, through a pure parser validated by a schema (see `readServerConfig`). No other module reads `process.env`. Pass config in as data.
- One source of truth: environment variables with sensible defaults. Do not use per-environment config files or `NODE_ENV` branches. Use an explicit variable for each behaviour (`LOG_LEVEL`, `FLIGHT_PLAN_DATA_DIR`).
- This is about the server's own config. Flight Plan's product configurations (system instructions and presets) are user data, handled by the domain core.
- Never log secrets (forge tokens). Redact them in the logger configuration.

## Logging

- Use Fastify's Pino logger: `request.log` inside requests and `server.log` elsewhere. No `console` in server code. The only exception is `main.ts` reporting a failure before the server exists.
- Log structured objects: `request.log.info({ reviewId, fileCount }, "review loaded")`. Do not build log messages with string concatenation.
- Use the right level: `error` for failures that need attention, `warn` for recoverable problems, `info` for lifecycle events, and `debug` for detail. Nothing at `info` in hot paths.
- Redact `req.headers.authorization` and any token fields.
- Use `request.id` to correlate logs, and pass it to child loggers in long operations.

## Async and waterfalls

- Run independent I/O in parallel with `Promise.all`. Start promises early and await them late.
- Move an `await` into the branch that uses it, and check cheap synchronous conditions before awaiting anything remote.
- For partial dependencies, chain the dependent promise with `.then` and await everything together.
- Prefer one procedure that gathers related data in parallel on the server over several round trips from the browser.

## State and caching

- **No module-level mutable state for request data.** Requests run concurrently in one process, so request-scoped values travel as arguments, the tRPC context or `request` decorators.
- **Load static resources once**: instructions, presets and tree-sitter grammars are loaded at startup or on first use through an idempotent loader, not on every request.
- **Cross-request caches** (codegraph results, forge responses) use a bounded LRU with a TTL, keyed by everything that affects the result (repository path, commit SHA, preset). Close their timers in `onClose`.
- **Coalesce identical in-flight requests** (`async-cache-dedupe` or a keyed promise map) so ten callers asking for the same codegraph trigger one build.

## Performance

- Fastify is fast by default. Keep it that way with response schemas, precompiled validation and no per-request schema compilation.
- **Do not block the event loop.** CPU-heavy work such as codegraph building, tree-sitter parsing and large diffs runs in a worker pool (`piscina`), not in a handler.
- **Stream large responses** (file contents, large diffs) instead of building them in memory.
- Set explicit body and payload limits (`bodyLimit`) that fit the real payloads.
- Consider `@fastify/under-pressure` to shed load and `@fastify/compress` for large JSON responses.

## Security for a local app

- Bind to `localhost` by default. Only an explicit `HOST` value can expose the server.
- The frontend is served from the same origin, so do not enable CORS. If a cross-origin client is ever needed, allow a fixed list of origins, never `*` with credentials.
- Every file-system path that comes from a request or an MCP call is resolved and checked to stay inside the allowed repository root. Reject `..` escapes and symlinks that leave the root.
- Never pass request input into a shell. Run git and other binaries with argument arrays, never string commands.
- Resolve bundled assets relative to the module, never relative to `process.cwd()`.

## Content types and bodies

- JSON is parsed by default. Add parsers with `addContentTypeParser` only for types you actually accept, and always set explicit size limits.
- For uploads (review artifacts), use `@fastify/multipart` with `limits` for file size and count, and validate the parsed file content against its schema.

## TypeScript

- Type raw routes with generics (`server.get<{ Params: ReviewParams; Reply: ReviewResponse }>(...)`) or infer them from zod schemas. Do not cast `request.params as ...`.
- Type plugins as `FastifyPluginAsync<Options>`, and type hooks with `onRequestHookHandler`, `preHandlerHookHandler` and so on.
- Put shared types next to the schemas they come from.
- Avoid type gymnastics. A simple interface beats a clever conditional type.

## Testing

- Test through `server.inject(...)` on an instance from `buildServer()`. Never listen on a port in tests, and always `await server.close()`.
- Test plugins alone: register one on a bare `Fastify()` instance, `await server.ready()`, and assert on its decorators and routes.
- Test procedures with `appRouter.createCaller(context)` using in-memory fakes in the context.
- Cover validation failures, 404 and 405 paths, error mapping and redaction, not only the happy path.
- Disable the logger in tests unless the test asserts on logs.

## Lifecycle and shutdown

- `main.ts` handles `SIGINT` and `SIGTERM` with `close-with-grace`: it logs the reason, then `await server.close()` so every `onClose` hook runs. Set a delay so a stuck close cannot hang the process.
- A health check (`health` procedure) stays cheap and reports readiness of the backend's dependencies when there are any.
