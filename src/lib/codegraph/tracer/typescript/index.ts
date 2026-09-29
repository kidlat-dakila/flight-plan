/**
 * The TypeScript / JavaScript import graph.
 *
 * The one language-specific half of the file-import tracer: read a file, find
 * every module specifier it writes (`import`, `export … from`, `require()`,
 * `import()`), and resolve each to an in-tree file with `repo.resolve` (see
 * `resolve.ts`), so nothing about how a specifier names a file is re-decided
 * here.
 */
import { literal } from "./bindings"
import { parse, type Node, type ParseCache, type Parsed } from "./estree"
import type { RepoGraph } from "./repoGraph"
import type { ResolveModule } from "./resolve"
import type { ImportEdge, ImportGraph, Importer } from "../importTree"

/** Where the bytes come from, what is in the tree, and which file each import names. */
export type Repo = {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  /** The repository file a module specifier names; see `moduleResolver`. */
  resolve: ResolveModule
  /** One walk's parsed files, shared by every resolver; each resolver keeps its own without it. */
  parsed?: ParseCache
  /** The commit's import graph; when set, it resolves imports and finds candidate callers. */
  graph?: RepoGraph
}

/** One module specifier written in a file, and the syntax that wrote it. */
type Specifier = { specifier: string; line: number; kind: ImportEdge["kind"] }

/**
 * Every module specifier in a file.
 *
 * Import and export statements are top-level by definition, so they are read
 * from the program's body. `require()` and `import()` are calls that live
 * anywhere — a dynamic import is awaited inside a function almost by
 * definition — so the whole tree is walked for those.
 */
function specifiersOf(parsed: Parsed): Specifier[] {
  const out: Specifier[] = []
  const lineOf = (node: Node): number => parsed.positionAt(node.start).line

  for (const statement of parsed.program.body as Node[]) {
    if (!/^(ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)$/.test(statement.type)) continue
    const specifier = literal(parsed, statement.source as Node | null)
    // `export const x = 1` has no source; only `export … from "…"` does.
    if (specifier === null) continue
    const typeOnly = statement.importKind === "type" || statement.exportKind === "type"
    out.push({ specifier, line: lineOf(statement), kind: typeOnly ? "type" : "static" })
  }

  for (const node of parsed.nodes) {
    const kind: ImportEdge["kind"] | null =
      node.type === "ImportExpression"
        ? "dynamic"
        : node.type === "CallExpression" && (node.callee as Node).type === "Identifier" && (node.callee as Node).name === "require"
          ? "require"
          : null
    if (kind === null) continue
    const first = node.type === "ImportExpression" ? (node.source as Node) : ((node.arguments as Node[])[0] ?? null)
    const specifier = literal(parsed, first)
    // A computed specifier (`import(`./${x}`)`) names no single file.
    if (specifier !== null) out.push({ specifier, line: lineOf(node), kind })
  }

  return out
}

export function typescriptImportGraph(
  repo: Repo,
  candidates: (file: string) => Promise<string[]>,
): ImportGraph {
  const importsOf = async (file: string): Promise<Importer[]> => {
    const text = await repo.read(file)
    if (text === null) return []
    const parsed = parse(file, text)
    if (parsed === null) return []
    const specifiers = specifiersOf(parsed)
    // One entry per imported file, carrying every edge that reaches it.
    const byPath = new Map<string, ImportEdge[]>()
    for (const found of specifiers) {
      const resolved = await repo.resolve(file, found.specifier)
      if (resolved === null) continue
      const edges = byPath.get(resolved) ?? []
      edges.push({ kind: found.kind, line: found.line })
      byPath.set(resolved, edges)
    }

    return [...byPath].map(([path, edges]) => ({
      path,
      edges: edges.sort((one, two) => one.line - two.line),
    }))
  }

  return { importsOf, candidates }
}
