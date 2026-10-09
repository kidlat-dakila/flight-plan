# packages/codegraph/src/ast-graph/languages/typescript

How a `.ts`, `.mts` or `.cts` file is read. Read [TypeScript](../../../../../../docs/vocabulary/codegraph/languages/typescript.md) before changing anything here. The rules of [ast-graph/AGENTS.md](../../AGENTS.md) and of [packages/codegraph/AGENTS.md](../../../../AGENTS.md) hold here too.

## Rules

- **A language of the AST graph has its own folder.** `ast-graph/languages/typescript/` holds `TypescriptASTGraphFile` in `index.ts` and one module per extraction beside it: `encapsulations.ts`, `declarations.ts`, `imports.ts`, `references.ts` and `exports.ts`, with `scopes.ts`, `patterns.ts` and `syntax.ts` under them. The class reads trees of the `typescript` grammar. Each extraction asks the tree for the node types it reads with a tree-sitter query, through `nodesMatching` in `ast-graph/query-nodes.ts`, and does not visit the other nodes. `languages/nest-encapsulations.ts` nests the encapsulations a language found by what contains what.
