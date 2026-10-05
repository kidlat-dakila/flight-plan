import * as path from "node:path"
import { tsPlugin } from "@sveltejs/acorn-typescript"
import { analyze, ScopeType, type ScopeManager, type ScopeVariable } from "@typescript-eslint/scope-manager"
import { Parser } from "acorn"
import jsx from "acorn-jsx"
import { Memo, once } from "@/core/memo"
import type { Pos, Range } from "@/core/types"
import { count } from "@/core/walk-stats"
import { adapt } from "./adapt"
import { childAt, isNode, nodesIn, type Node } from "./node"

export type { Node } from "./node"

export type Grammar = "javascript" | "typescript"

export type Variable = ScopeVariable

export interface Definition {
  type: string
  name: Node
  node: Node
  parent: Node | null
}

export interface Scopes {
  moduleVariable: (name: string) => Variable | null
  variableOf: (name: Node) => Variable | null
  valueReads: (variable: Variable) => Node[]
  declared: (declaration: Node) => Variable[]
  definitionOf: (variable: Variable) => Definition | null
}

export interface Parsed {
  source: string
  program: Node
  grammar: Grammar
  parentOf: (node: Node) => Node | null
  nodes: readonly Node[]
  scopes: () => Scopes
  positionAt: (offset: number) => Pos
}

const OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
  preserveParens: true,
  allowHashBang: true,
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
  ranges: true,
} as const

const parsers = {
  javascript: Parser.extend(jsx()),
  typescript: Parser.extend(tsPlugin()),
  declarations: Parser.extend(tsPlugin({ dts: true })),
  tsx: Parser.extend(tsPlugin({ jsx: true })),
}

function parserFor(file: string): { parser: typeof Parser, grammar: Grammar } | null {
  if (/\.d\.[cm]?ts$/i.test(file)) return { parser: parsers.declarations, grammar: "typescript" }
  switch (path.extname(file).toLowerCase()) {
    case ".ts":
    case ".mts":
    case ".cts":
      return { parser: parsers.typescript, grammar: "typescript" }
    case ".tsx":
    case ".jsx":
      return { parser: parsers.tsx, grammar: "typescript" }
    case ".js":
    case ".mjs":
    case ".cjs":
      return { parser: parsers.javascript, grammar: "javascript" }
    default:
      return null
  }
}

type AnalyzedProgram = Parameters<typeof analyze>[0]
type DeclaringNode = Parameters<ScopeManager["getDeclaredVariables"]>[0]
type Visit = readonly [node: Node, parent: Node | null]

const HALF = 2
const BLOCK_COMMENT_START = "/*"
const BLOCK_COMMENT_END = "*/"

const isAnalyzedProgram = (node: Node): node is Node & AnalyzedProgram => node.type === "Program"

const isDeclaringNode = (node: Node): node is Node & DeclaringNode => node.type !== ""

export function childrenOf(node: Node): Node[] {
  const children = Object.entries(node)
    .filter(([key]) => key !== "loc" && key !== "range")
    .flatMap(([, value]) => nodesIn(value))
  return [...children].sort((one, two) => one.start - two.start)
}

function parseProgram(parser: typeof Parser, source: string): Node | null {
  const began = performance.now()
  try {
    const program: unknown = parser.parse(source, OPTIONS)
    return isNode(program) ? program : null
  } catch {
    return null
  } finally {
    count("parseMs", performance.now() - began)
  }
}

function visitsOf(node: Node, parent: Node | null): Visit[] {
  if (node.type === "ChainExpression") {
    const expression = childAt(node, "expression")
    return expression === null ? [] : visitsOf(expression, parent)
  }
  return [[node, parent], ...childrenOf(node).flatMap((child) => visitsOf(child, node))]
}

function lineIndexAt(lineStarts: readonly number[], offset: number, low: number, high: number): number {
  if (low >= high) return low
  const middle = Math.ceil((low + high) / HALF)
  return (lineStarts[middle] ?? 0) <= offset
    ? lineIndexAt(lineStarts, offset, middle, high)
    : lineIndexAt(lineStarts, offset, low, middle - 1)
}

export function parse(file: string, source: string): Parsed | null {
  const chosen = parserFor(file)
  if (chosen === null) return null

  const raw = parseProgram(chosen.parser, source)
  if (raw === null) return null
  count("parses")
  count("parsedChars", source.length)

  const program = adapt(raw, source)
  const visits = childrenOf(program).flatMap((child) => visitsOf(child, null))
  const parents = new Map<Node, Node | null>([...visits, [program, null]])
  const lineStarts = [0, ...[...source.matchAll(/\n/g)].map((match) => match.index + 1)]
  const positionAt = (offset: number): Pos => {
    const index = lineIndexAt(lineStarts, offset, 0, lineStarts.length - 1)
    return { line: index + 1, column: offset - (lineStarts[index] ?? 0) }
  }

  return {
    source,
    program,
    grammar: chosen.grammar,
    parentOf: (node) => parents.get(node) ?? null,
    nodes: visits.map(([node]) => node),
    scopes: once(() => scopesOf(program)),
    positionAt,
  }
}

function definitionOf(variable: Variable): Definition | null {
  if (variable.defs.length === 0) return null
  const first = variable.defs[0]
  if (!isNode(first.name) || !isNode(first.node)) return null
  const parent: unknown = first.parent
  return { type: first.type, name: first.name, node: first.node, parent: isNode(parent) ? parent : null }
}

function scopesOf(program: Node): Scopes {
  if (!isAnalyzedProgram(program)) throw new Error("Scopes are analysed from a Program node")
  const manager = analyze(program, { sourceType: "module" })
  const global = manager.globalScope
  const module = global?.childScopes.find((scope) => scope.type === ScopeType.module) ?? global
  const resolved = new Map<Node, Variable | null>(
    manager.scopes.flatMap((scope) =>
      scope.references.flatMap((reference): [Node, Variable | null][] =>
        isNode(reference.identifier) ? [[reference.identifier, reference.resolved]] : [],
      ),
    ),
  )
  const declaredBy = new Map<Node, Variable>(
    manager.scopes.flatMap((scope) =>
      scope.variables.flatMap((variable) =>
        variable.identifiers.flatMap((name): [Node, Variable][] => (isNode(name) ? [[name, variable]] : [])),
      ),
    ),
  )
  return {
    moduleVariable: (name) => module?.set.get(name) ?? null,
    variableOf: (name) => resolved.get(name) ?? declaredBy.get(name) ?? null,
    valueReads: (variable) => {
      const reads = variable.references
        .filter((reference) => reference.isRead() && reference.isValueReference)
        .flatMap((reference) => nodesIn(reference.identifier))
      return [...reads].sort((one, two) => one.start - two.start)
    },
    declared: (declaration) => (isDeclaringNode(declaration) ? manager.getDeclaredVariables(declaration) : []),
    definitionOf,
  }
}

export const rangeBetween = (parsed: Parsed, start: number, end: number): Range => ({
  start: parsed.positionAt(start),
  end: parsed.positionAt(end),
})

export const rangeOf = (parsed: Parsed, node: Node): Range => rangeBetween(parsed, node.start, node.end)

export const textOf = (parsed: Parsed, node: Node): string => parsed.source.slice(node.start, node.end)

export function skipTrivia(source: string, from: number): number {
  const at = from + (/^\s*/.exec(source.slice(from))?.[0].length ?? 0)
  if (source.startsWith("//", at)) {
    const end = source.indexOf("\n", at)
    return skipTrivia(source, end === -1 ? source.length : end)
  }
  if (source.startsWith(BLOCK_COMMENT_START, at)) {
    const end = source.indexOf(BLOCK_COMMENT_END, at + BLOCK_COMMENT_START.length)
    return skipTrivia(source, end === -1 ? source.length : end + BLOCK_COMMENT_END.length)
  }
  return at
}

export interface ParseCache {
  parsedOf: (file: string, read: (file: string) => Promise<string | null>) => Promise<Parsed | null>
}

export function parseCache(): ParseCache {
  const held = new Memo<string, Promise<Parsed | null>>()
  return {
    parsedOf: async (file, read) => held.remember(file, async () => read(file).then((text) => (text === null ? null : parse(file, text)))),
  }
}
