/**
 * One file's syntax tree, as ESTree, for the TypeScript / JavaScript tracer.
 *
 * acorn parses: plain JavaScript with JSX for `.js`/`.mjs`/`.cjs`, and
 * `@sveltejs/acorn-typescript` for `.ts`/`.mts`/`.cts` (with its `.d.ts`
 * mode) and for `.tsx`/`.jsx`. The tree lives in the JavaScript heap, so there
 * is nothing to free.
 *
 * {@link adapt} then gives the tree the shapes typescript-estree v8 has, so
 * `@typescript-eslint/scope-manager` can resolve every name to its variable
 * ({@link Parsed.scopes}).
 *
 * The tracer's rules were written against tree-sitter's grammars, so this
 * module keeps a few of tree-sitter's ways of reading the tree:
 * - {@link Parsed.grammar} says which grammar the file used to be read with,
 *   because the JavaScript and TypeScript grammars shape some nodes
 *   differently (class fields);
 * - parentheses are kept (`preserveParens`), as tree-sitter keeps them;
 * - `ChainExpression` is skipped, as tree-sitter has no node for `a?.b()`;
 * - positions count lines at `\n` only and columns in UTF-16 units, as
 *   tree-sitter reports them.
 */
import { Parser } from "acorn"
import jsx from "acorn-jsx"
import { tsPlugin } from "@sveltejs/acorn-typescript"
import { analyze, type ScopeVariable } from "@typescript-eslint/scope-manager"
import * as path from "node:path"
import type { Pos, Range } from "../../types"
import { count } from "../../walkStats"
import { adapt } from "./adapt"

/** An ESTree node. The tracer reads fields by name and checks their `type`. */
export type Node = { type: string; start: number; end: number; [field: string]: unknown }

/** The grammar a file used to be read with, which some rules depend on. */
export type Grammar = "javascript" | "typescript"

/** A variable, as the scope manager gives it. */
export type Variable = ScopeVariable

/** How a variable is declared: its first definition, as tracer nodes. */
export type Definition = {
  /** The scope manager's kind: `ImportBinding`, `FunctionName`, `Variable`, `Parameter`, … */
  type: string
  /** The declared name. */
  name: Node
  /** The declaring node: the import specifier, the function, the declarator, … */
  node: Node
  /** Its statement where there is one: the import declaration, the variable declaration. */
  parent: Node | null
}

/** Which variable each name in a file means. */
export type Scopes = {
  /** The module-scope variable of a name, or null. */
  moduleVariable: (name: string) => Variable | null
  /** The variable a reference resolves to, or the one a declared name declares; null for neither. */
  variableOf: (name: Node) => Variable | null
  /** The names that read a variable as a value, in source order. */
  valueReads: (variable: Variable) => Node[]
  /** The variables a declaration (a declarator, a function) declares. */
  declared: (declaration: Node) => Variable[]
  /** How a variable is declared; null for an implicit global. */
  definitionOf: (variable: Variable) => Definition | null
}

/** One parsed file. */
export type Parsed = {
  source: string
  program: Node
  grammar: Grammar
  /** The parent of a node, skipping `ChainExpression`; null for the program. */
  parentOf: (node: Node) => Node | null
  /** Every node below the program, in pre-order, children in source order. */
  nodes: readonly Node[]
  /** Which variable each name means, analysed on first use. */
  scopes: () => Scopes
  /** The position of an offset: 1-based line, 0-based UTF-16 column. */
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
  // The scope manager reads `range`.
  ranges: true,
} as const

const parsers = {
  javascript: Parser.extend(jsx()),
  typescript: Parser.extend(tsPlugin()),
  declarations: Parser.extend(tsPlugin({ dts: true })),
  tsx: Parser.extend(tsPlugin({ jsx: true })),
}

/** The parser and grammar for a path, or null when this tracer does not read it. */
function parserFor(file: string): { parser: typeof Parser; grammar: Grammar } | null {
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

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

/** The child nodes of a node, in source order. */
export function childrenOf(node: Node): Node[] {
  const out: Node[] = []
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "range") continue
    if (Array.isArray(value)) {
      for (const one of value) if (isNode(one)) out.push(one)
    } else if (isNode(value)) {
      out.push(value)
    }
  }
  return out.sort((one, two) => one.start - two.start)
}

/** Parses one file, or null when this tracer does not read it or it does not parse. */
export function parse(file: string, source: string): Parsed | null {
  const chosen = parserFor(file)
  if (chosen === null) return null

  let program: Node
  const began = performance.now()
  try {
    program = chosen.parser.parse(source, OPTIONS) as unknown as Node
  } catch {
    return null
  } finally {
    count("parseMs", performance.now() - began)
  }
  count("parses")
  count("parsedChars", source.length)

  adapt(program, source)

  const parents = new Map<Node, Node | null>()
  const nodes: Node[] = []

  const visit = (node: Node, parent: Node | null): void => {
    // tree-sitter has no node for an optional chain: its children hang on the
    // chain's own parent.
    if (node.type === "ChainExpression") {
      visit(node.expression as Node, parent)
      return
    }
    parents.set(node, parent)
    nodes.push(node)
    for (const child of childrenOf(node)) visit(child, node)
  }
  for (const child of childrenOf(program)) visit(child, null)
  parents.set(program, null)

  const lineStarts = [0]
  for (let at = source.indexOf("\n"); at !== -1; at = source.indexOf("\n", at + 1)) lineStarts.push(at + 1)
  const positionAt = (offset: number): Pos => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if ((lineStarts[middle] ?? 0) <= offset) low = middle
      else high = middle - 1
    }
    return { line: low + 1, column: offset - (lineStarts[low] ?? 0) }
  }

  let scopes: Scopes | undefined
  return {
    source,
    program,
    grammar: chosen.grammar,
    parentOf: (node) => parents.get(node) ?? null,
    nodes,
    scopes: () => (scopes ??= scopesOf(program)),
    positionAt,
  }
}

/** Resolves every name of a parsed program to its variable. */
function scopesOf(program: Node): Scopes {
  const manager = analyze(program as unknown as Parameters<typeof analyze>[0], { sourceType: "module" })
  const global = manager.globalScope
  const module = global?.childScopes.find((scope) => scope.type === "module") ?? global
  const resolved = new Map<Node, Variable | null>()
  const declaredBy = new Map<Node, Variable>()
  for (const scope of manager.scopes) {
    for (const reference of scope.references) resolved.set(reference.identifier as unknown as Node, reference.resolved)
    for (const variable of scope.variables) for (const name of variable.identifiers) declaredBy.set(name as unknown as Node, variable)
  }
  return {
    moduleVariable: (name) => module?.set.get(name) ?? null,
    variableOf: (name) => resolved.get(name) ?? declaredBy.get(name) ?? null,
    valueReads: (variable) =>
      variable.references
        .filter((reference) => reference.isRead() && reference.isValueReference)
        .map((reference) => reference.identifier as unknown as Node)
        .sort((one, two) => one.start - two.start),
    declared: (declaration) => manager.getDeclaredVariables(declaration as unknown as Parameters<typeof manager.getDeclaredVariables>[0]),
    definitionOf: (variable) => {
      const first = variable.defs[0]
      if (first === undefined) return null
      return {
        type: first.type,
        name: first.name as unknown as Node,
        node: first.node as unknown as Node,
        parent: (first.parent as unknown as Node | null | undefined) ?? null,
      }
    },
  }
}

/** The range of the source between two offsets. */
export const rangeBetween = (parsed: Parsed, start: number, end: number): Range => ({
  start: parsed.positionAt(start),
  end: parsed.positionAt(end),
})

/** The range a node spans. */
export const rangeOf = (parsed: Parsed, node: Node): Range => rangeBetween(parsed, node.start, node.end)

/** The source text a node spans. */
export const textOf = (parsed: Parsed, node: Node): string => parsed.source.slice(node.start, node.end)

/** The offset of the first character at or after `from` that is not whitespace or a comment. */
export function skipTrivia(source: string, from: number): number {
  let at = from
  for (;;) {
    while (at < source.length && /\s/.test(source[at] ?? "")) at++
    if (source.startsWith("//", at)) {
      const end = source.indexOf("\n", at)
      at = end === -1 ? source.length : end
    } else if (source.startsWith("/*", at)) {
      const end = source.indexOf("*/", at + 2)
      at = end === -1 ? source.length : end + 2
    } else {
      return at
    }
  }
}

/** One walk's parsed files, each parsed once. */
export type ParseCache = {
  parsedOf: (file: string, read: (file: string) => Promise<string | null>) => Promise<Parsed | null>
}

export function parseCache(): ParseCache {
  const held = new Map<string, Promise<Parsed | null>>()
  return {
    parsedOf: (file, read) => {
      let one = held.get(file)
      if (one === undefined) {
        one = read(file).then((text) => (text === null ? null : parse(file, text)))
        held.set(file, one)
      }
      return one
    },
  }
}
