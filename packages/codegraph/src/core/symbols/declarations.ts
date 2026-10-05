import { withTree } from "@/core/tracer/parse"
import { parse, skipTrivia, textOf, type Parsed } from "@/core/tracer/typescript/estree"
import { childAt, childrenAt, isNode, textAt, type Node } from "@/core/tracer/typescript/node"
import { pythonDeclarationsIn } from "./python"
import type { SymbolSpan } from "./spans"

const CALLABLES = new Set(["FunctionDeclaration", "TSDeclareFunction", "MethodDefinition", "TSAbstractMethodDefinition", "TSMethodSignature"])
const CONTAINERS = new Set(["ClassDeclaration", "TSInterfaceDeclaration", "TSEnumDeclaration", "TSModuleDeclaration"])
const OTHERS = new Set(["TSTypeAliasDeclaration", "TSPropertySignature"])
const FIELDS = new Set(["PropertyDefinition", "TSAbstractPropertyDefinition", "AccessorProperty", "TSAbstractAccessorProperty"])
const DECLARED_FIELD = /^(PropertyDefinition|TSAbstractPropertyDefinition)$/
const METHOD = /^(MethodDefinition|TSAbstractMethodDefinition)$/

const isFunctionValue = (node: unknown): boolean =>
  isNode(node) && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") && node.generator !== true

function classify(node: Node, parsed: Parsed): SymbolSpan["kind"] | null {
  if (CALLABLES.has(node.type)) return "callable"
  if (CONTAINERS.has(node.type)) return "container"
  if (OTHERS.has(node.type)) return "other"
  if (!FIELDS.has(node.type) || parsed.grammar !== "typescript") return null
  return isFunctionValue(node.value) ? "callable" : "other"
}

const innermostModule = (node: Node): Node => {
  const body = childAt(node, "body")
  return body?.type === "TSModuleDeclaration" ? innermostModule(body) : node
}

function membersOf(node: Node): Node[] {
  const body = childAt(node.type === "TSModuleDeclaration" ? innermostModule(node) : node, "body")
  if (body === null) return []
  if (node.type === "ClassDeclaration" || node.type === "TSInterfaceDeclaration") return childrenAt(body, "body")
  return node.type === "TSModuleDeclaration" && body.type === "TSModuleBlock" ? childrenAt(body, "body") : []
}

function unwrap(node: Node): Node[] {
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    const declaration = childAt(node, "declaration")
    return declaration === null ? [] : unwrap(declaration)
  }
  if (node.declare === true && !DECLARED_FIELD.test(node.type)) return []
  return [node]
}

function startOf(parsed: Parsed, node: Node): number {
  const decorators = childrenAt(node, "decorators")
  if (decorators.length === 0) return node.start
  const after = skipTrivia(parsed.source, decorators[decorators.length - 1].end)
  if (METHOD.test(node.type)) return after
  if (node.type === "ClassDeclaration" && /^export\b/.test(parsed.source.slice(after))) return after
  return node.start
}

function span(parsed: Parsed, node: Node): { from: number, to: number } {
  return { from: parsed.positionAt(startOf(parsed, node)).line, to: parsed.positionAt(node.end).line }
}

function nameAt(parsed: Parsed, offset: number): { line: number, column: number } {
  const at = parsed.positionAt(offset)
  return { line: at.line, column: at.column + 1 }
}

function nameOf(parsed: Parsed, node: Node): { text: string, start: number } | null {
  const key = childAt(node, "key") ?? childAt(node, "id")
  if (key === null) return null
  if (node.type === "TSModuleDeclaration") {
    const end = childAt(innermostModule(node), "id")?.end ?? key.end
    return { text: parsed.source.slice(key.start, end), start: key.start }
  }
  if (node.computed === true) {
    const open = parsed.source.lastIndexOf("[", key.start)
    return { text: parsed.source.slice(open, parsed.source.indexOf("]", key.end) + 1), start: open }
  }
  const identifier = key.type === "Identifier" ? textAt(key, "name") : null
  return { text: identifier ?? textOf(parsed, key), start: key.start }
}

const qualify = (prefix: string, name: string): string => (prefix === "" ? name : `${prefix}.${name}`)

function fromLexical(parsed: Parsed, node: Node, prefix: string): SymbolSpan[] {
  return childrenAt(node, "declarations").flatMap((declarator) => {
    const id = childAt(declarator, "id")
    if (id === null) return []
    const end = id.type === "Identifier" ? id.start + (textAt(id, "name") ?? "").length : (childAt(id, "typeAnnotation")?.start ?? id.end)
    const name = parsed.source.slice(id.start, end).trimEnd()
    return [
      {
        name: qualify(prefix, name),
        ...span(parsed, node),
        nameAt: nameAt(parsed, id.start),
        kind: isFunctionValue(declarator.init) ? "callable" : "other",
      },
    ]
  })
}

const isPromoted = (parameter: Node): boolean =>
  parameter.type === "TSParameterProperty" && (parameter.accessibility !== undefined || parameter.readonly === true)

function parameterProperties(parsed: Parsed, constructorNode: Node, prefix: string): SymbolSpan[] {
  const value = childAt(constructorNode, "value")
  if (value === null) return []
  return childrenAt(value, "params")
    .filter(isPromoted)
    .flatMap((parameter) => {
      const inner = childAt(parameter, "parameter")
      const named = inner?.type === "AssignmentPattern" ? childAt(inner, "left") : inner
      const name = named?.type === "Identifier" ? textAt(named, "name") : null
      if (named === null || name === null) return []
      return [{ name: qualify(prefix, name), ...span(parsed, parameter), nameAt: nameAt(parsed, named.start), kind: "other" as const }]
    })
}

const isConstructor = (child: Node, name: string): boolean =>
  child.type === "MethodDefinition" && name === "constructor" && childAt(child, "value")?.type === "FunctionExpression"

function spansOf(parsed: Parsed, child: Node, prefix: string): SymbolSpan[] {
  if (child.type === "VariableDeclaration") return fromLexical(parsed, child, prefix)
  const kind = classify(child, parsed)
  const name = kind === null ? null : nameOf(parsed, child)
  if (kind === null || name === null) return []
  const qualified = qualify(prefix, name.text)
  return [
    { name: qualified, ...span(parsed, child), nameAt: nameAt(parsed, name.start), kind },
    ...(isConstructor(child, name.text) ? parameterProperties(parsed, child, prefix) : []),
    ...(kind === "container" ? walk(parsed, membersOf(child), qualified) : []),
  ]
}

function walk(parsed: Parsed, nodes: readonly Node[], prefix: string): SymbolSpan[] {
  return nodes.flatMap(unwrap).flatMap((child) => spansOf(parsed, child, prefix))
}

export function declarationsIn(parsed: Parsed): SymbolSpan[] {
  return walk(parsed, childrenAt(parsed.program, "body"), "")
}

export type SymbolLanguage = "typescript" | "python"

export function symbolLanguageOf(file: string): SymbolLanguage | null {
  if (/\.(py|pyi)$/i.test(file)) return "python"
  if (/\.(ts|mts|cts|tsx|jsx|js|mjs|cjs)$/i.test(file)) return "typescript"
  return null
}

export async function fileSymbols(file: string, text: string): Promise<SymbolSpan[] | null> {
  const language = symbolLanguageOf(file)
  if (language === null) return null
  if (language === "python") return withTree(file, text, pythonDeclarationsIn, null)
  const parsed = parse(file, text)
  return parsed === null ? null : declarationsIn(parsed)
}
