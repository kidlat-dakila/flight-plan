# packages/ui

Flight Plan's component library: shadcn primitives and the shared presentational components that pages compose, such as CodeLink, CodeBlock, Journey Flow Diagram and Blast Diagram. Read [architecture](../../docs/agents/architecture.md) and [react](../../docs/agents/react.md) before changing anything here.

## Rules

- **Props in, JSX out.** Components receive all data and callbacks through props. They never call an API, use tRPC or TanStack Query, read the router, or touch browser storage for domain data.
- **No logic beyond rendering.** Pick variants from discriminant props (`kind`, `status`, `severity`). Do not compute them.
- `src/components/ui/` holds shadcn building blocks. Add them only with `cd packages/ui && pnpm dlx shadcn@latest add <component>`. Their dependencies go in this package's `package.json`.
- `src/components/<ComponentName>/index.tsx` holds shared composed components, with tests in `__tests__/` next to them.
- Style with Tailwind classes and the tokens in `src/styles/globals.css`. Use `cn` from `lib/utils` to merge classes.
- Consumers import each component by its direct path. Do not add re-exports to `src/index.ts`.
- Components are accessible: semantic elements, labels, keyboard support. `jsx-a11y` strict is enforced.

## Verify

- `pnpm nx run-many -t eslint:lint typecheck test -p ui`. If `typecheck` or `test` targets are still missing, add them.
- Each component has `@testing-library/react` tests that render it with props and assert on roles, text and callbacks.
- Check changed components in the running app with `agent-browser`, following [testing](../../docs/agents/testing.md#ui-verification-with-agent-browser).
