# packages/ui

Flight Plan's component library: shadcn primitives and the shared presentational components that pages compose, such as CodeLink, CodeBlock, Journey Flow Diagram and Blast Diagram. Read [architecture](../../docs/agents/architecture.md) and [react](../../docs/agents/react.md) before changing anything here.

## Rules

- **Props in, JSX out.** Components receive all data and callbacks through props. They never call an API, use tRPC or TanStack Query, read the router, or touch browser storage for domain data.
- **No logic beyond rendering.** Pick variants from discriminant props (`kind`, `status`, `severity`). Do not compute them.
- `src/components/blocks/` holds shadcn building blocks. Add them only with `cd packages/ui && pnpm dlx shadcn@latest add <component>`. Their dependencies go in this package's `package.json`. The CLI writes named exports: make the component the file's default export and fix imports between blocks.
- `src/components/<ComponentName>/index.tsx` holds shared composed components, with tests in `__tests__/` next to them.
- Style with Tailwind classes and the tokens in `src/styles/globals.css`. Use `cn` from `lib/utils` to merge classes.
- Every file under `src/components/` default-exports its component, and lint enforces it. Consumers import it by its path under `src/components/` (`@flightplan/ui/blocks/button`, `@flightplan/ui/CodeLink`). Inside this package, files import each other through `@/` (`@/components/blocks/button`), which is also what the shadcn CLI writes. There is no package root and no barrel file.
- Components are accessible: semantic elements, labels, keyboard support. `jsx-a11y` strict is enforced.

## Verify

- `nx run-many -t eslint:lint typecheck test -p ui`
- Each component has `@testing-library/react` tests that render it with props and assert on roles, text and callbacks.
- Check changed components in the running app with `agent-browser`, following [testing](../../docs/agents/testing.md#ui-verification-with-agent-browser).
