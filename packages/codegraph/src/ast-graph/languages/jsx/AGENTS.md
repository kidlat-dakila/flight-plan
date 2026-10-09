# packages/codegraph/src/ast-graph/languages/jsx

How a `.tsx`, `.jsx`, `.js`, `.mjs` or `.cjs` file is read. Read [JavaScript and JSX](../../../../../../docs/vocabulary/codegraph/languages/jsx.md) before changing anything here. The rules of [ast-graph/AGENTS.md](../../AGENTS.md) and of [packages/codegraph/AGENTS.md](../../../../AGENTS.md) hold here too.

## Rules

- **JSX is TypeScript with elements.** `ast-graph/languages/jsx/` holds `JSXASTGraphFile`, which reads trees of the `tsx` grammar: `.tsx`, `.jsx` and plain JavaScript files. It reuses the TypeScript extractions and adds the element rules in `jsx/references.ts`: an element whose name starts with a capital, or that is a member such as `<Form.Field>`, is a use of that name, counted once at its opening tag. A lowercase element, a namespaced element and an attribute name are not uses. The specs in `typescript/__tests__/` run every TypeScript case against both classes through `SCRIPT_DIALECTS` in `languages/__tests__/script-files.ts`.
