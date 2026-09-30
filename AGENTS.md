# Flight Plan

Flight Plan turns a pull request into a guided review. A coding agent writes a review artifact through Flight Plan's MCP tools, and a local web app renders that artifact next to the code. Users start the app with `npx` or `pnpm dlx`.

The repo is moving from a VS Code extension (`src/`) to an Nx monorepo web app (`apps/`, `packages/`). All new work goes into `apps/` and `packages/`. Only open `src/` to read code you are porting.

## Read before you work

This file applies to every task. Nested `AGENTS.md` files add rules for their folder and never relax the ones here. Read the guides for the files you touch before writing code:

| You are touching | Read |
|---|---|
| Any code | [architecture](docs/agents/architecture.md), [functional programming](docs/agents/functional-programming.md), [naming](docs/agents/naming.md), [testing](docs/agents/testing.md) |
| `apps/frontend`, `packages/ui`, any `.tsx` | [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) or [packages/ui/AGENTS.md](packages/ui/AGENTS.md), then [react](docs/agents/react.md) |
| `apps/backend`, `packages/api` | [apps/backend/AGENTS.md](apps/backend/AGENTS.md) or [packages/api/AGENTS.md](packages/api/AGENTS.md), then [fastify](docs/agents/fastify.md) |

## Rules

1. **The frontend renders, the backend decides.** The frontend only renders data it receives from the backend. Filtering, sorting, grouping, deriving, validating, formatting and every other decision live in the backend. See [architecture](docs/agents/architecture.md).
2. **Functional core, imperative shell.** Keep I/O, time, randomness and logging in a thin outer layer. Everything else is a pure function over immutable data. Never mutate shared data or arguments. Keep each function at one level of abstraction. See [functional programming](docs/agents/functional-programming.md).
3. **Names carry the meaning.** Names must be understandable, concise, consistent and distinguishable, with one word per concept across the whole stack. See [naming](docs/agents/naming.md).
4. **No code comments.** Do not write inline comments, block comments, docstrings, JSDoc or TODOs, including in examples. Make code explain itself through names, small functions and named constants. Tooling directives such as `eslint-disable` or `@ts-expect-error` are allowed only when there is no other way, and they need the user's approval.
5. **Every change ships with tests.** New behaviour gets new tests. Changed behaviour gets updated tests. Bug fixes start with a failing test. See [testing](docs/agents/testing.md).
6. **Verify before you say it is done.** Run lint, type-check and tests for every project you touched. For a UI change, also open the running app with `agent-browser` and check it. Report what you ran and what it printed.
7. **Finish the work.** Do not leave stubs, placeholder data outside explicit mock APIs, skipped tests, `any`, non-null assertions to silence the compiler, or disabled lint rules. If something cannot be done properly, stop and say so.

## Workspace

```
apps/backend       Fastify 5 server: tRPC at /api/trpc, MCP at POST /mcp, port 3000
apps/frontend      React 19 + Vite, TanStack Router and TanStack Query, port 4200 (proxies /api to :3000)
packages/api       tRPC router, input schemas and domain logic, imported as @flight-plan/api
packages/ui        shadcn primitives and shared presentational components, imported as @flight-plan/ui/...
src/               legacy VS Code extension, read-only reference for porting
```

The frontend may import from `@flight-plan/api` only with `import type`. No server code may reach the browser bundle.

## Commands

Always run tasks through Nx with the workspace package manager. Never call `vitest`, `eslint`, `vite` or `tsc` directly when a target exists.

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the backend (:3000) and the frontend (:4200) side by side |
| `pnpm nx run-many -t eslint:lint typecheck test -p <projects>` | Verify specific projects |
| `pnpm nx affected -t eslint:lint typecheck test` | Verify everything your change affects |
| `pnpm nx build <project>` | Build one project |
| `pnpm nx show project <project>` | List a project's targets |

The lint target is `eslint:lint`, not `lint`. If a project you touch has no `typecheck` or `test` target, add one in the same change instead of skipping the check.

## Definition of done

- [ ] Code follows the rules above and the guides for the area you touched.
- [ ] Tests cover the new or changed behaviour and pass.
- [ ] `pnpm nx run-many -t eslint:lint typecheck test -p <touched projects>` passes with zero errors and zero warnings.
- [ ] UI changes were exercised in a browser with `agent-browser` (see [testing](docs/agents/testing.md#ui-verification-with-agent-browser)), and the browser console shows no errors.
- [ ] Your final message lists the commands you ran and their results. If something failed or was skipped, say so.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->