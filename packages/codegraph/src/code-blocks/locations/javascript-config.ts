import { parseWithGrammar, type GrammarId, type SyntaxNode } from "@/ast-graph/parser"
import { argumentIndexOf, fitsKey, valuesOrSilent, type CallSegment, type ConfigValues, type KeySegment, type PathSegment } from "./key-paths"
import { evaluatePath, readPathModule, type PathModule } from "./path-values"

const MODULE_EXPORTS = "module.exports"
const DEFAULT_KEYWORD = "default"
const WRAPPING_TYPES: ReadonlySet<string> = new Set(["parenthesized_expression", "as_expression", "satisfies_expression", "await_expression", "non_null_expression"])
const CALLING_TYPES: ReadonlySet<string> = new Set(["call_expression", "new_expression"])
const FUNCTION_TYPES: ReadonlySet<string> = new Set(["arrow_function"])
const DECLARATION_TYPES: ReadonlySet<string> = new Set(["lexical_declaration", "variable_declaration"])
const TEXT_TYPES: ReadonlySet<string> = new Set(["string", "template_string"])
const SUBSTITUTION_TYPE = "template_substitution"
const ESCAPE_TYPE = "escape_sequence"
const ESCAPED_CHARACTERS: ReadonlyMap<string, string> = new Map([
  ["n", "\n"],
  ["t", "\t"],
  ["r", "\r"],
])
const ANY_TEXT = "*"
const IMPORT_CALLEE = "import"
const JSX_EXTENSION_PATTERN = /\.[jt]sx$/

interface ScriptTree {
  readonly root: SyntaxNode
  readonly declared: ReadonlyMap<string, SyntaxNode>
  readonly pathModule: PathModule
}

const listTopDeclarators = (root: SyntaxNode): SyntaxNode[] =>
  root.namedChildren.flatMap((statement) => {
    const declaration = statement.type === "export_statement" ? statement.childForFieldName("declaration") : statement
    return declaration !== null && DECLARATION_TYPES.has(declaration.type) ? declaration.namedChildren.filter((child) => child.type === "variable_declarator") : []
  })

const declaredOf = (root: SyntaxNode): ReadonlyMap<string, SyntaxNode> =>
  new Map(
    listTopDeclarators(root).flatMap((declarator) => {
      const name = declarator.childForFieldName("name")
      const value = declarator.childForFieldName("value")
      return name === null || value === null ? [] : [[name.text, value] as const]
    }),
  )

const isDefaultExport = (statement: SyntaxNode): boolean => statement.type === "export_statement" && statement.children.some((child) => child.type === DEFAULT_KEYWORD)

const defaultExportOf = (statement: SyntaxNode): SyntaxNode[] => {
  const value = statement.childForFieldName("value") ?? statement.childForFieldName("declaration")
  return isDefaultExport(statement) && value !== null ? [value] : []
}

const moduleExportsOf = (statement: SyntaxNode): SyntaxNode[] => {
  const assignment = statement.type === "expression_statement" ? statement.firstNamedChild : null
  if (assignment?.type !== "assignment_expression") return []
  const right = assignment.childForFieldName("right")
  return assignment.childForFieldName("left")?.text === MODULE_EXPORTS && right !== null ? [right] : []
}

const exportedValuesOf = (root: SyntaxNode): SyntaxNode[] => [
  ...root.namedChildren.flatMap((statement) => [...defaultExportOf(statement), ...moduleExportsOf(statement)]),
  ...listTopDeclarators(root).flatMap((declarator) => declarator.childForFieldName("value") ?? []),
]

const argumentsOf = (call: SyntaxNode): SyntaxNode[] =>
  (call.childForFieldName("arguments")?.namedChildren ?? []).filter((argument) => argument.type !== "comment")

const bodyOf = (arrow: SyntaxNode): SyntaxNode | null => {
  const body = arrow.childForFieldName("body")
  return body === null || body.type === "statement_block" ? null : body
}

const unwrap = (node: SyntaxNode, tree: ScriptTree, seen: ReadonlySet<SyntaxNode> = new Set()): SyntaxNode | null => {
  if (seen.has(node)) return null
  const next = new Set([...seen, node])
  if (WRAPPING_TYPES.has(node.type)) return node.firstNamedChild === null ? null : unwrap(node.firstNamedChild, tree, next)
  if (FUNCTION_TYPES.has(node.type)) {
    const body = bodyOf(node)
    return body === null ? null : unwrap(body, tree, next)
  }
  if (CALLING_TYPES.has(node.type)) {
    const object = argumentsOf(node).map((argument) => unwrap(argument, tree, next)).find((argument) => argument?.type === "object")
    return object ?? null
  }
  if (node.type === "identifier") {
    const value = tree.declared.get(node.text)
    return value === undefined ? null : unwrap(value, tree, next)
  }
  return node
}

const keyTextOf = (key: SyntaxNode): string | null => {
  if (key.type === "property_identifier") return key.text
  return key.type === "string" ? key.namedChildren.map((part) => part.text).join("") : null
}

const propertiesOf = (object: SyntaxNode, segment: KeySegment, tree: ScriptTree): SyntaxNode[] =>
  object.namedChildren.flatMap((property) => {
    if (property.type === "shorthand_property_identifier") return fitsKey(segment, property.text) ? (tree.declared.get(property.text) ?? []) : []
    if (property.type !== "pair") return []
    const key = property.childForFieldName("key")
    const value = property.childForFieldName("value")
    const keyText = key === null ? null : keyTextOf(key)
    return keyText !== null && value !== null && fitsKey(segment, keyText) ? [value] : []
  })

const calleeNameOf = (call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function") ?? call.childForFieldName("constructor")
  if (callee === null) return null
  if (callee.type === IMPORT_CALLEE) return IMPORT_CALLEE
  if (callee.type === "member_expression") return callee.childForFieldName("property")?.text ?? null
  return callee.type === "identifier" ? callee.text : null
}

const listCalls = (node: SyntaxNode): SyntaxNode[] => [...(CALLING_TYPES.has(node.type) ? [node] : []), ...node.namedChildren.flatMap(listCalls)]

const argumentsAt = (segment: CallSegment, tree: ScriptTree): SyntaxNode[] => {
  const index = argumentIndexOf(segment)
  if (index === null) return []
  return listCalls(tree.root)
    .filter((call) => calleeNameOf(call) === segment.name)
    .flatMap((call) => argumentsOf(call).slice(index, index + 1))
}

const unescaped = (escape: string): string => {
  const character = escape.slice(1)
  return ESCAPED_CHARACTERS.get(character) ?? character
}

const textOfPart = (part: SyntaxNode): string => {
  if (part.type === SUBSTITUTION_TYPE) return ANY_TEXT
  return part.type === ESCAPE_TYPE ? unescaped(part.text) : part.text
}

const textOf = (node: SyntaxNode): string => node.namedChildren.map(textOfPart).join("")

const leavesOf = (node: SyntaxNode, tree: ScriptTree): string[] => {
  if (TEXT_TYPES.has(node.type)) return [textOf(node)]
  const evaluated = evaluatePath(node, tree.pathModule)
  if (evaluated !== null) return [evaluated]
  if (node.type === "array") return node.namedChildren.flatMap((item) => leavesOf(item, tree))
  if (node.type === "identifier") {
    const value = tree.declared.get(node.text)
    return value === undefined ? [] : leavesOf(value, tree)
  }
  return []
}

const nodesBelow = (node: SyntaxNode, segments: readonly PathSegment[], tree: ScriptTree): SyntaxNode[] => {
  if (segments.length === 0) return [node]
  const [segment, ...rest] = segments
  if (segment.kind === "call") return argumentsAt(segment, tree).flatMap((argument) => nodesBelow(argument, rest, tree))
  const object = unwrap(node, tree)
  if (object?.type === "array") return object.namedChildren.flatMap((item) => nodesBelow(item, segments, tree))
  return object?.type === "object" ? propertiesOf(object, segment, tree).flatMap((value) => nodesBelow(value, rest, tree)) : []
}

export interface ScriptConfig {
  readonly valuesAt: (segments: readonly PathSegment[]) => ConfigValues
  readonly holdsSection: (segments: readonly PathSegment[]) => boolean
}

const grammarOf = (filePath: string): GrammarId => (JSX_EXTENSION_PATTERN.test(filePath) ? "tsx" : "typescript")

export const readJavascriptConfig = (filePath: string, text: string): ScriptConfig => {
  const root = parseWithGrammar(grammarOf(filePath), text).rootNode
  const tree: ScriptTree = { root, declared: declaredOf(root), pathModule: readPathModule(root) }
  const exported = exportedValuesOf(root)
  const nodesAt = (segments: readonly PathSegment[]): SyntaxNode[] =>
    segments.length > 0 && segments[0].kind === "call" ? nodesBelow(root, segments, tree) : exported.flatMap((value) => nodesBelow(value, segments, tree))
  return {
    valuesAt: (segments) => valuesOrSilent(nodesAt(segments).flatMap((node) => leavesOf(node, tree))),
    holdsSection: (segments) => nodesAt(segments).some((node) => unwrap(node, tree)?.type === "object"),
  }
}
