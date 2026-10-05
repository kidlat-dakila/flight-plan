import type { ImportEdge, ImportGraph, Importer } from "@/core/tracer/import-tree"
import { literal } from "./bindings"
import { parse, type ParseCache, type Parsed } from "./estree"
import { childAt, childrenAt, nodesIn, type Node } from "./node"
import type { RepoGraph } from "./repo-graph"
import type { ResolveModule } from "./resolve"

export interface Repo {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  resolve: ResolveModule
  parsed?: ParseCache
  graph?: RepoGraph
}

interface Specifier { specifier: string, line: number, kind: ImportEdge["kind"] }

const STATIC_SPECIFIER_STATEMENT = /^(ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)$/

const isRequireCall = (node: Node): boolean => {
  const callee = node.type === "CallExpression" ? childAt(node, "callee") : null
  return callee?.type === "Identifier" && callee.name === "require"
}

function staticSpecifiersOf(parsed: Parsed): Specifier[] {
  return childrenAt(parsed.program, "body")
    .filter((statement) => STATIC_SPECIFIER_STATEMENT.test(statement.type))
    .flatMap((statement): Specifier[] => {
      const specifier = literal(parsed, childAt(statement, "source"))
      if (specifier === null) return []
      const isTypeOnly = statement.importKind === "type" || statement.exportKind === "type"
      return [{ specifier, line: parsed.positionAt(statement.start).line, kind: isTypeOnly ? "type" : "static" }]
    })
}

function loadedSpecifiersOf(parsed: Parsed, node: Node, kind: ImportEdge["kind"], sources: readonly Node[]): Specifier[] {
  return sources.flatMap((source) => {
    const specifier = literal(parsed, source)
    return specifier === null ? [] : [{ specifier, line: parsed.positionAt(node.start).line, kind }]
  })
}

function dynamicSpecifiersOf(parsed: Parsed): Specifier[] {
  return parsed.nodes.flatMap((node) => {
    if (node.type === "ImportExpression") return loadedSpecifiersOf(parsed, node, "dynamic", nodesIn(node.source))
    return isRequireCall(node) ? loadedSpecifiersOf(parsed, node, "require", childrenAt(node, "arguments").slice(0, 1)) : []
  })
}

function specifiersOf(parsed: Parsed): Specifier[] {
  return [...staticSpecifiersOf(parsed), ...dynamicSpecifiersOf(parsed)]
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
    const resolved = await Promise.all(
      specifiersOf(parsed).map(async (found) => ({ found, path: await repo.resolve(file, found.specifier) })),
    )
    const byPath = resolved.reduce<ReadonlyMap<string, readonly ImportEdge[]>>(
      (held, { found, path }) =>
        path === null ? held : new Map(held).set(path, [...(held.get(path) ?? []), { kind: found.kind, line: found.line }]),
      new Map(),
    )

    return [...byPath].map(([path, edges]) => ({ path, edges: [...edges].sort((one, two) => one.line - two.line) }))
  }

  return { importsOf, candidates }
}
