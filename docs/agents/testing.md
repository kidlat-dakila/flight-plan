# Testing and verification

Every change ships with tests, and no work is done until it has been verified. "It compiles" and "it should work" are not verification.

## When to write tests

- **New behaviour**: write tests that describe it. Where practical, write the test first and watch it fail.
- **Changed behaviour**: update the existing tests to describe the new behaviour. Do not delete a test to get green.
- **Bug fix**: write a test that reproduces the bug and fails, then fix the code and watch the test pass.
- **Refactor**: the existing tests must pass unchanged. If they are missing, add them before you refactor.
- **Ported code from `src/`**: port its tests too, adapted to the new structure.

## Where tests live

Tests live in a `__tests__/` folder next to the unit they cover, named `<unit>.spec.ts` or `<unit>.spec.tsx`:

```
apps/frontend/src/pages/pr-reviews/components/FileSection/__tests__/file-section.spec.tsx
packages/ui/src/components/CodeLink/__tests__/code-link.spec.tsx
packages/api/src/review/__tests__/build-segments.spec.ts
apps/backend/src/utils/git-adapter/__tests__/read-diff.spec.ts
```

The runner is Vitest with globals enabled (`describe`, `it`, `expect` need no import). Name tests after behaviour and outcome: `it("groups files by directory")`, not `it("works")`.

## What to test on each side

| Layer | How |
|---|---|
| Pure calculations (`packages/api`, backend utils) | Plain input and output assertions, with no mocks. This is where most tests belong, and the functional-core rule makes it cheap. |
| tRPC procedures | `appRouter.createCaller(context)` with a context that holds in-memory fakes for I/O. Assert on the output and on validation errors. |
| Fastify routes and MCP | Build the server with `buildServer()` and call `server.inject(...)`. Never bind a real port. Always `await server.close()`. See `apps/backend/src/server.spec.ts`. |
| I/O adapters (git, file system) | Run against real temporary directories or repositories created in the test, then clean them up. |
| `packages/ui` components | `@testing-library/react` in jsdom. Render with props, assert on what the user sees (roles, text, accessible names) and that callbacks fire. No API mocks, because these components never call APIs. |
| Pages in `apps/frontend` | `@testing-library/react` with a `QueryClient` and a tRPC client pointed at a fake backend. Assert that the page renders loading, error, empty and loaded states from the backend data. |

Rules:

- Test behaviour through public interfaces, not private helpers or implementation details.
- Use fakes (in-memory implementations of the same interface) rather than mocking modules. If a unit is hard to test without `vi.mock`, it probably hides an action, so extract the calculation.
- Tests are deterministic. Pass time, randomness and IDs in as parameters. Never sleep or rely on real timers or real network.
- Each test sets up its own state. No shared mutable fixtures across tests.
- Cover the error paths and edge cases (empty input, missing file, forge error), not only the happy path.

## Running checks

Run everything through Nx:

| Command | When |
|---|---|
| `pnpm nx test <project>` | While you work |
| `pnpm nx run-many -t eslint:lint typecheck test -p <projects>` | Before you report the work as done |
| `pnpm nx affected -t eslint:lint typecheck test` | When the change spans several projects |

Lint and type errors count as failures, and so do warnings. Fix the cause. Do not add `eslint-disable`, `@ts-expect-error`, `any` or `!` to get through.

## UI verification with agent-browser

Unit tests do not prove that a page works. Every change that affects what the user sees must also be checked in a real browser with the [`agent-browser`](https://github.com/vercel-labs/agent-browser) CLI.

Before you use it, load its current guide from the CLI, because the instructions match the installed version:

```bash
agent-browser skills get core
agent-browser skills get dogfood
```

Use `core` for targeted checks of the change you made. Use `dogfood` for exploratory QA of a whole page or flow, for example when a stage of work finishes.

Call the `agent-browser` binary directly, never through `npx`.

### Targeted check (every UI change)

1. Start the app with `pnpm dev` in the background and wait until `http://localhost:4200` responds.
2. Open the page you changed in a named session:
   ```bash
   agent-browser --session flight-plan open http://localhost:4200/<route>
   agent-browser --session flight-plan snapshot -i
   ```
3. Take the actions the change affects (`click @eN`, `fill @eN "text"`), and run `snapshot -i` again after each page change.
4. Check that the rendered result matches the data the backend returned.
5. Check for runtime problems:
   ```bash
   agent-browser --session flight-plan errors
   agent-browser --session flight-plan console
   ```
6. Take a screenshot as evidence, then close the session:
   ```bash
   agent-browser --session flight-plan screenshot --annotate <path>.png
   agent-browser --session flight-plan close
   ```

Also check the loading, empty and error states, and a narrow viewport.

### Dogfood run (end of a feature or stage)

Follow `agent-browser skills get dogfood` with `http://localhost:4200` as the target and the feature as the scope. Document every issue with reproduction steps and screenshots as you find it, and fix or report each one.

## Reporting

In the final message, list the commands you ran and their results: tests passed and failed, lint and type-check status, and what you checked in the browser. If something failed, was skipped or could not be verified, say so plainly.
