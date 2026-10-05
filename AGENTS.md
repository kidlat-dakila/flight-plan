# Flight Plan

Flight Plan turns a pull request into a guided review. A coding agent writes a review artifact through Flight Plan's MCP tools, and a local web app renders that artifact next to the code. Users start the app with `npx` or `pnpm dlx`.

The repo is moving from a VS Code extension (`src/`) to an Nx monorepo web app (`apps/`, `packages/`). All new work goes into `apps/` and `packages/`. Only open `src/` to read code you are porting.

## Read before you work

This file applies to every task. Nested `AGENTS.md` files add rules for their folder and never relax the ones here. Use the terms defined in [docs/vocabulary](docs/vocabulary/README.md) in code, names and prose, and read the entry for any concept you work on. Read the guides for the files you touch before writing code:

| You are touching | Read |
|---|---|
| Any code | [architecture](docs/agents/architecture.md), [functional programming](docs/agents/functional-programming.md), [naming](docs/agents/naming.md), [testing](docs/agents/testing.md) |
| `apps/frontend`, `packages/ui`, any `.tsx` | [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) or [packages/ui/AGENTS.md](packages/ui/AGENTS.md), then [react](docs/agents/react.md) |
| Anything the user sees: a page, a component, a style, copy | [product](docs/PRODUCT.md) for who the product is for and what it must do, and [design](docs/DESIGN.md) for the design system |
| `apps/backend` | [apps/backend/AGENTS.md](apps/backend/AGENTS.md), then [fastify](docs/agents/fastify.md) |
| `packages/configurations` | [packages/configurations/AGENTS.md](packages/configurations/AGENTS.md), then [prompt configurations](docs/vocabulary/prompt-configurations.md) |

## Rules

1. **The frontend renders, the backend decides.** The frontend only renders data it receives from the backend. Filtering, sorting, grouping, deriving, validating, formatting and every other decision live in the backend. See [architecture](docs/agents/architecture.md).
2. **Functional core, imperative shell.** Keep I/O, time, randomness and logging in a thin outer layer. Everything else is a pure function over immutable data. Never mutate shared data or arguments. Keep each function at one level of abstraction. See [functional programming](docs/agents/functional-programming.md).
3. **Names carry the meaning.** Names must be understandable, concise, consistent and distinguishable, with one word per concept across the whole stack. See [naming](docs/agents/naming.md).
4. **No code comments.** Do not write inline comments, block comments, docstrings, JSDoc or TODOs, including in examples. Make code explain itself through names, small functions and named constants. Tooling directives such as `eslint-disable` or `@ts-expect-error` are allowed only when there is no other way, and they need the user's approval.
5. **Every change ships with tests.** New behaviour gets new tests. Changed behaviour gets updated tests. Bug fixes start with a failing test. See [testing](docs/agents/testing.md).
6. **Verify before you say it is done.** After every change, run ESLint (`eslint:lint`), type-check and tests for every project you touched, and fix every error before you continue. ESLint enforces most of these rules, and every rule is an error, so a clean run is required, not optional. For a UI change, also open the running app with `agent-browser` and check it. Report what you ran and what it printed.
7. **Finish the work.** Do not leave stubs, placeholder data outside explicit mock APIs, skipped tests, `any`, non-null assertions to silence the compiler, or disabled lint rules. If something cannot be done properly, stop and say so.

## Workspace

```
apps/backend       Fastify 5 server: tRPC at /api/trpc, MCP at POST /mcp, port 3000
apps/frontend      React 19 + Vite, TanStack Router and TanStack Query, port 4200 (proxies /api to :3000)
packages/ui        shadcn primitives and shared presentational components, imported as @flightplan/ui/<path>
packages/configurations  the instructions an agent writes a review artifact with: system instructions, preset configurations and the field catalog, imported by the backend as @flightplan/configurations
src/               legacy VS Code extension, read-only reference for porting
```

Inside a project, import from parent folders through `@/`, which points at that project's `src/`; `../` is rejected by lint. The frontend imports only the `AppRouter` type from the backend, with `import type` from `@flightplan/backend/router`. The backend imports the field catalog from `@flightplan/configurations`. No server code may reach the browser bundle.

## Commands

Always run tasks through Nx, and call `nx` directly, never through `pnpm nx` or `pnpm exec nx`. Never call `vitest`, `eslint`, `vite` or `tsc` directly when a target exists.

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the backend (:3000) and the frontend (:4200) side by side |
| `pnpm lint` | Run ESLint on every project |
| `pnpm lint:fix` | Run ESLint on every project and apply its automatic fixes |
| `nx run-many -t eslint:lint typecheck test -p <projects>` | Verify specific projects |
| `nx affected -t eslint:lint typecheck test` | Verify everything your change affects |
| `nx build <project>` | Build one project |
| `nx show project <project>` | List a project's targets |

A husky pre-commit hook runs `nx affected -t eslint:lint typecheck` for the projects the staged files touch, and ESLint on the root `eslint*.config.ts` files when they are staged. Never bypass it with `--no-verify`. If it fails, fix the cause.

The lint target is `eslint:lint`, not `lint`. If a project you touch has no `typecheck` or `test` target, add one in the same change instead of skipping the check.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Call `nx` directly (e.g., `nx build`, `nx test`), never through the package manager (`pnpm nx`, `pnpm exec nx`)
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