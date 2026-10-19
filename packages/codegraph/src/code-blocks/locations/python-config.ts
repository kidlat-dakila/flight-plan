import { parseWithGrammar, type SyntaxNode } from "@/ast-graph/parser"
import { argumentIndexOf, fitsKey, valuesOrSilent, type CallSegment, type ConfigValues, type KeySegment, type PathSegment } from "./key-paths"

const LIST_TYPES: ReadonlySet<string> = new Set(["list", "tuple", "set"])
const INTERPOLATION_TYPE = "interpolation"
const STRING_CONTENT_TYPES: ReadonlySet<string> = new Set(["string_content"])
const ANY_TEXT = "*"

interface ModuleTree {
  readonly root: SyntaxNode
  readonly assigned: ReadonlyMap<string, SyntaxNode>
}

const assignmentOf = (statement: SyntaxNode): SyntaxNode | null => {
  const assignment = statement.type === "expression_statement" ? statement.firstNamedChild : null
  return assignment?.type === "assignment" ? assignment : null
}

const textOf = (node: SyntaxNode): string =>
  node.namedChildren
    .filter((part) => STRING_CONTENT_TYPES.has(part.type) || part.type === INTERPOLATION_TYPE)
    .map((part) => (part.type === INTERPOLATION_TYPE ? ANY_TEXT : part.text))
    .join("")

const assignedNameOf = (left: SyntaxNode): string | null => {
  if (left.type === "identifier") return left.text
  const key = left.type === "subscript" ? left.childForFieldName("subscript") : null
  return key?.type === "string" ? textOf(key) : null
}

const assignedEntriesOf = (statement: SyntaxNode): (readonly [string, SyntaxNode])[] => {
  if (statement.type === "class_definition") return (statement.childForFieldName("body")?.namedChildren ?? []).flatMap(assignedEntriesOf)
  const assignment = assignmentOf(statement)
  const left = assignment?.childForFieldName("left") ?? null
  const right = assignment?.childForFieldName("right") ?? null
  const name = left === null ? null : assignedNameOf(left)
  return name === null || right === null ? [] : [[name, right] as const]
}

const assignedOf = (root: SyntaxNode): ReadonlyMap<string, SyntaxNode> => new Map(root.namedChildren.flatMap(assignedEntriesOf))

const leavesOf = (node: SyntaxNode, tree: ModuleTree): string[] => {
  if (node.type === "string") return [textOf(node)]
  if (node.type === "concatenated_string") return [node.namedChildren.map(textOf).join("")]
  if (LIST_TYPES.has(node.type)) return node.namedChildren.flatMap((item) => leavesOf(item, tree))
  if (node.type === "identifier") {
    const value = tree.assigned.get(node.text)
    return value === undefined ? [] : leavesOf(value, tree)
  }
  return []
}

const entriesOf = (dictionary: SyntaxNode, segment: KeySegment): SyntaxNode[] =>
  dictionary.namedChildren.flatMap((pair) => {
    const key = pair.type === "pair" ? pair.childForFieldName("key") : null
    const value = pair.childForFieldName("value")
    return key?.type === "string" && value !== null && fitsKey(segment, textOf(key)) ? [value] : []
  })

const calleeNameOf = (call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function")
  if (callee?.type === "attribute") return callee.childForFieldName("attribute")?.text ?? null
  return callee?.type === "identifier" ? callee.text : null
}

const listCalls = (node: SyntaxNode): SyntaxNode[] => [...(node.type === "call" ? [node] : []), ...node.namedChildren.flatMap(listCalls)]

const argumentOf = (call: SyntaxNode, segment: CallSegment): SyntaxNode[] => {
  const written = call.childForFieldName("arguments")?.namedChildren ?? []
  const index = argumentIndexOf(segment)
  if (index !== null) {
    const positional = written.filter((argument) => argument.type !== "keyword_argument")
    return index < positional.length ? [positional[index]] : []
  }
  return written.flatMap((argument) => {
    const value = argument.childForFieldName("value")
    return argument.type === "keyword_argument" && argument.childForFieldName("name")?.text === segment.argument && value !== null ? [value] : []
  })
}

const valueOf = (node: SyntaxNode, tree: ModuleTree): SyntaxNode | undefined => (node.type === "identifier" ? tree.assigned.get(node.text) : node)

const nodesBelow = (node: SyntaxNode, segments: readonly PathSegment[], tree: ModuleTree): SyntaxNode[] => {
  if (segments.length === 0) return [node]
  const [segment, ...rest] = segments
  if (segment.kind === "call") {
    return listCalls(tree.root)
      .filter((call) => calleeNameOf(call) === segment.name)
      .flatMap((call) => argumentOf(call, segment).flatMap((argument) => nodesBelow(argument, rest, tree)))
  }
  const value = valueOf(node, tree)
  return value?.type === "dictionary" ? entriesOf(value, segment).flatMap((entry) => nodesBelow(entry, rest, tree)) : []
}

export interface ModuleConfig {
  readonly valuesAt: (segments: readonly PathSegment[]) => ConfigValues
  readonly holdsSection: (segments: readonly PathSegment[]) => boolean
}

const topValuesOf = (segment: KeySegment, tree: ModuleTree): SyntaxNode[] => [...tree.assigned].filter(([name]) => fitsKey(segment, name)).map(([, value]) => value)

export const readPythonConfig = (text: string): ModuleConfig => {
  const root = parseWithGrammar("python", text).rootNode
  const tree: ModuleTree = { root, assigned: assignedOf(root) }
  const nodesAt = (segments: readonly PathSegment[]): SyntaxNode[] => {
    if (segments.length === 0) return []
    const [first, ...rest] = segments
    if (first.kind === "call") return nodesBelow(root, segments, tree)
    return topValuesOf(first, tree).flatMap((value) => nodesBelow(value, rest, tree))
  }
  return {
    valuesAt: (segments) => valuesOrSilent(nodesAt(segments).flatMap((node) => leavesOf(node, tree))),
    holdsSection: (segments) => nodesAt(segments).some((node) => valueOf(node, tree)?.type === "dictionary"),
  }
}
