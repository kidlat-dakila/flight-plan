import { tsPlugin } from "@sveltejs/acorn-typescript"
import { Parser } from "acorn"
import jsx from "acorn-jsx"
import { z } from "zod"

export type DeclarationKind = "callable" | "container" | "other"

export interface DeclarationSpan {
  readonly name: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly kind: DeclarationKind
}

interface SyntaxNode {
  readonly type: string
  readonly [field: string]: unknown
}

const PARSE_OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
  locations: true,
  allowHashBang: true,
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
} as const

const SCRIPT_PARSERS = {
  javascript: Parser.extend(jsx()),
  typescript: Parser.extend(tsPlugin()),
  typeDeclarations: Parser.extend(tsPlugin({ dts: true })),
  tsx: Parser.extend(tsPlugin({ jsx: true })),
}

const TYPE_DECLARATION_PATTERN = /\.d\.[cm]?ts$/i
const TYPESCRIPT_PATTERN = /\.[cm]?ts$/i
const TSX_PATTERN = /\.[jt]sx$/i
const JAVASCRIPT_PATTERN = /\.[cm]?js$/i

const CALLABLE_TYPES: ReadonlySet<string> = new Set([
  "FunctionDeclaration",
  "TSDeclareFunction",
  "MethodDefinition",
  "TSAbstractMethodDefinition",
  "TSMethodSignature",
])

const CONTAINER_TYPES: ReadonlySet<string> = new Set([
  "ClassDeclaration",
  "TSInterfaceDeclaration",
  "TSEnumDeclaration",
  "TSModuleDeclaration",
])

const PLAIN_TYPES: ReadonlySet<string> = new Set(["TSTypeAliasDeclaration", "TSPropertySignature"])

const PROPERTY_TYPES: ReadonlySet<string> = new Set([
  "PropertyDefinition",
  "TSAbstractPropertyDefinition",
  "AccessorProperty",
])

const FUNCTION_VALUE_TYPES: ReadonlySet<string> = new Set(["ArrowFunctionExpression", "FunctionExpression"])

const EXPORT_TYPES: ReadonlySet<string> = new Set(["ExportNamedDeclaration", "ExportDefaultDeclaration"])

const NAME_SEPARATOR = "."

const locationSchema = z.object({
  start: z.object({ line: z.number() }),
  end: z.object({ line: z.number() }),
})

const offsetsSchema = z.object({ start: z.number(), end: z.number() })

const parserFor = (path: string): typeof Parser | null => {
  if (TYPE_DECLARATION_PATTERN.test(path)) return SCRIPT_PARSERS.typeDeclarations
  if (TYPESCRIPT_PATTERN.test(path)) return SCRIPT_PARSERS.typescript
  if (TSX_PATTERN.test(path)) return SCRIPT_PARSERS.tsx
  return JAVASCRIPT_PATTERN.test(path) ? SCRIPT_PARSERS.javascript : null
}

const isSyntaxNode = (value: unknown): value is SyntaxNode =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"

const nodeAt = (node: SyntaxNode, field: string): SyntaxNode | null => {
  const value = node[field]
  return isSyntaxNode(value) ? value : null
}

const nodesAt = (node: SyntaxNode, field: string): readonly SyntaxNode[] => {
  const value = node[field]
  return Array.isArray(value) ? value.filter(isSyntaxNode) : []
}

const lineSpanOf = (node: SyntaxNode): Pick<DeclarationSpan, "lineStart" | "lineEnd"> | null => {
  const location = locationSchema.safeParse(node.loc)
  return location.success ? { lineStart: location.data.start.line, lineEnd: location.data.end.line } : null
}

const sourceTextOf = (source: string, node: SyntaxNode): string | null => {
  const offsets = offsetsSchema.safeParse(node)
  return offsets.success ? source.slice(offsets.data.start, offsets.data.end) : null
}

const isFunctionValue = (node: SyntaxNode | null): boolean =>
  node !== null && FUNCTION_VALUE_TYPES.has(node.type) && node.generator !== true

const kindOf = (node: SyntaxNode): DeclarationKind | null => {
  if (CALLABLE_TYPES.has(node.type)) return "callable"
  if (CONTAINER_TYPES.has(node.type)) return "container"
  if (PLAIN_TYPES.has(node.type)) return "other"
  if (PROPERTY_TYPES.has(node.type)) return isFunctionValue(nodeAt(node, "value")) ? "callable" : "other"
  return null
}

const innermostModule = (node: SyntaxNode): SyntaxNode => {
  const body = nodeAt(node, "body")
  return body?.type === "TSModuleDeclaration" ? innermostModule(body) : node
}

const membersOf = (node: SyntaxNode): readonly SyntaxNode[] => {
  if (node.type === "ClassDeclaration" || node.type === "TSInterfaceDeclaration") {
    const body = nodeAt(node, "body")
    return body === null ? [] : nodesAt(body, "body")
  }
  if (node.type !== "TSModuleDeclaration") return []
  const block = nodeAt(innermostModule(node), "body")
  return block?.type === "TSModuleBlock" ? nodesAt(block, "body") : []
}

const unwrapExport = (node: SyntaxNode): readonly SyntaxNode[] => {
  if (!EXPORT_TYPES.has(node.type)) return node.declare === true ? [] : [node]
  const declaration = nodeAt(node, "declaration")
  return declaration === null ? [] : unwrapExport(declaration)
}

const nameOf = (source: string, node: SyntaxNode): string | null => {
  const name = nodeAt(node, "key") ?? nodeAt(node, "id")
  if (name === null) return null
  return name.type === "Identifier" && typeof name.name === "string" ? name.name : sourceTextOf(source, name)
}

const qualify = (prefix: string, name: string): string => (prefix === "" ? name : `${prefix}${NAME_SEPARATOR}${name}`)

const variableSpans = (source: string, node: SyntaxNode, prefix: string): DeclarationSpan[] => {
  const span = lineSpanOf(node)
  if (span === null) return []
  return nodesAt(node, "declarations").flatMap((declarator): DeclarationSpan[] => {
    const name = nameOf(source, declarator)
    return name === null
      ? []
      : [{ name: qualify(prefix, name), ...span, kind: isFunctionValue(nodeAt(declarator, "init")) ? "callable" : "other" }]
  })
}

const declarationSpans = (source: string, nodes: readonly SyntaxNode[], prefix: string): DeclarationSpan[] =>
  nodes.flatMap(unwrapExport).flatMap((node): DeclarationSpan[] => {
    if (node.type === "VariableDeclaration") return variableSpans(source, node, prefix)
    const kind = kindOf(node)
    const name = nameOf(source, node)
    const span = lineSpanOf(node)
    if (kind === null || name === null || span === null) return []
    const qualified = qualify(prefix, name)
    return [
      { name: qualified, ...span, kind },
      ...(kind === "container" ? declarationSpans(source, membersOf(node), qualified) : []),
    ]
  })

const parseProgram = (parser: typeof Parser, source: string): SyntaxNode | null => {
  try {
    const program: unknown = parser.parse(source, PARSE_OPTIONS)
    return isSyntaxNode(program) ? program : null
  } catch {
    return null
  }
}

export const readDeclarations = (path: string, source: string): readonly DeclarationSpan[] | null => {
  const parser = parserFor(path)
  const program = parser === null ? null : parseProgram(parser, source)
  return program === null ? null : declarationSpans(source, nodesAt(program, "body"), "")
}
