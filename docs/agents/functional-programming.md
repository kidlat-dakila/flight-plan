# Functional programming

Most bugs live in code whose result depends on when it runs or how many times it runs. Shrink that code, isolate it, and make everything else pure. Then most of the codebase can be tested without mocks and reasoned about locally.

## Classify every function

| Kind | Definition | Examples |
|---|---|---|
| **Action** | Its result depends on when or how often it runs | network, file system, git, database, `Date.now()`, `Math.random()`, logging, DOM, reading or writing mutable state, `process.env` |
| **Calculation** | The same inputs always give the same output, with no observable effects | transforms, validation, parsing, formatting, deciding what to do |
| **Data** | Inert facts | records, JSON, config values, events |

Prefer data over calculations, and calculations over actions.

**Actions spread.** Any function that calls an action is an action. One `Date.now()` deep in a helper makes the whole call chain depend on time. Pass the time in as a parameter instead.

**Implicit inputs and outputs** make a function an action. Implicit inputs include globals, `this` state, the clock, the environment and I/O. Implicit outputs include mutating arguments or globals, writing to I/O, and throwing for control flow. A function is a calculation when all its inputs are parameters and all its outputs are return values.

## Extract calculations from actions

1. Find the part of the action that decides or computes.
2. Move it into a new function.
3. Turn each implicit input into a parameter and each implicit output into a return value.
4. Leave a thin action that gathers inputs, calls the calculation and applies the result.

Before: one function reads the environment, decides and returns.

```ts
export const startServer = async () => {
  const port = Number(process.env.PORT) || 3000
  const server = await buildServer()
  await server.listen({ port })
}
```

After: `readServerConfig` is a calculation that tests without mocks, and `start` is the thin shell. This is the pattern in `apps/backend/src/config.ts` and `main.ts`.

```ts
export const readServerConfig = (environment: Environment): ServerConfig => ({
  host: environment.HOST ?? DEFAULT_HOST,
  port: parsePort(environment.PORT),
})

const start = async (): Promise<void> => {
  const { host, port } = readServerConfig(process.env)
  const server = await buildServer({ logger: true })
  await server.listen({ host, port })
}
```

Also split calculations by concern. Business rules and generic collection plumbing belong in separate functions.

## Immutability

- **Copy-on-write** inside code we own: never mutate. Copy, change the copy, return it. For nested data, copy only the path to the change.
- **Defensive copying** at boundaries with code that may mutate (third-party libraries, legacy `src/` code): copy data as it comes in and as it goes out.
- Use `readonly` fields and `ReadonlyArray`/`readonly T[]` in types. Prefer `toSorted`, `toReversed`, `toSpliced`, `with`, spread and `structuredClone` over `sort`, `reverse`, `splice`, `push` and property assignment.
- Split read-and-write operations (such as `shift`) into a read and a write, or return both values.
- Lint enforces `prefer-const`, `no-param-reassign` (with `props`), `@typescript-eslint/prefer-readonly`, `functional/no-let` and `functional/immutable-data`. The only mutations it allows are `ref.current` and `process.exitCode`.

```ts
const addFinding = (review: Review, finding: Finding): Review => ({
  ...review,
  findings: [...review.findings, finding],
})
```

## Stratified design

Arrange functions in layers by level of abstraction: domain rules on top, domain operations in the middle, language and library primitives at the bottom.

1. **Straightforward implementation**: a function body calls functions from about one layer below. A body that mixes domain calls with index arithmetic or hand-written loops needs the low-level part extracted.
2. **Abstraction barrier**: a layer that lets callers ignore how data is stored. The implementation behind it can then change freely.
3. **Minimal interface**: keep barrier layers small. Build new operations on top of the barrier instead of widening it.
4. **Comfortable layers**: add a layer only when it pays for itself.

Functions at the bottom are the most reused, so they must be the most stable and the best tested.

## First-class and higher-order functions

- **Express the implicit argument**: when a name encodes a value (`setTitleById`, `setStatusById`), make the value a parameter (`setFieldById(items, id, field, value)`).
- **Replace the body with a callback**: when code has the same before and after with a different middle, pass the middle as a function (`withRetry(fetchPullRequest)`, `withTiming(buildGraph)`).
- Use `map`, `filter`, `reduce` and `flatMap` in small, named steps instead of loops that do several things at once.
- For nested updates, write or use `update(object, key, transform)` and `updateIn(object, path, transform)` instead of get-modify-set chains.

## Timelines: async and concurrency

For async code (promises, request handlers, file watchers, MCP sessions), draw one timeline per independent sequence of actions. Only actions go on a timeline.

- Aim for fewer timelines, shorter timelines and fewer shared resources.
- Turn implicit sharing into explicit arguments and local variables. Replacing module-level mutable state with a local often removes a race entirely.
- `total = total + x` is three actions (read, add, write). Other timelines can interleave between them.
- Coordination primitives: a **queue** serialises access to a shared resource, a **dropping queue** keeps only the latest N tasks, a **cut** (`Promise.all`) waits for N timelines, and **just once** makes an initialisation idempotent.
- Request-scoped data never goes in module-level variables. Fastify handles requests concurrently in one process.

## Architecture: functional core, imperative shell

- The outside layer handles interaction: Fastify, tRPC transports, MCP transports, git, the file system and forge HTTP clients.
- The core holds domain rules as calculations over plain data.
- The shell gathers data, calls the core and applies the result. Dependencies point inward: the core never imports the shell.

In Flight Plan, the backend's transports (tRPC, MCP, raw routes) and I/O adapters are the shell, and its procedures — the logic itself, in `procedures/<procedure>/`, plus feature modules shared across them — are the core. In the frontend, route files are the shell (they call queries) and components are pure functions from props to JSX.

## Working with existing code

When you refactor, go step by step and keep behaviour identical:

1. Mark each function as an action, a calculation or data.
2. Pick the action with the most logic inside it and extract calculations from it.
3. Remove mutation with copy-on-write, and add defensive copies at legacy boundaries.
4. Remove duplication with higher-order functions.
5. Tidy the layers.

Run the tests after each step.

When you review, report hidden inputs and outputs, actions that do not need to be actions, mutation of shared or argument data, mixed abstraction levels, and shared resources across async timelines. Rank findings by payoff, with untestable business logic trapped inside actions first.

Stay pragmatic. Do not add layers without a reason, and do not bring in monads or category theory. This is about everyday code.
