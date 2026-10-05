import type { Node, Tree } from "web-tree-sitter"
import { parseSource } from "@/core/tracer/parse"
import type { Range, StepType } from "@/core/types"
import type { LanguageParser, Statement } from "."

interface Arm { label: string, nodes: Node[] }

const STEP_TYPES: Record<string, StepType> = {
  function_definition: "declaration",
  class_definition: "declaration",
  import_statement: "declaration",
  import_from_statement: "declaration",
  global_statement: "declaration",
  nonlocal_statement: "declaration",
  expression_statement: "expression",
  return_statement: "return",
  raise_statement: "throw",
  break_statement: "jump",
  continue_statement: "jump",
  pass_statement: "other",
  if_statement: "conditional",
  match_statement: "conditional",
  for_statement: "loop",
  while_statement: "loop",
  try_statement: "try",
  with_statement: "block",
  comment: "comment",
}

async function parse(source: string): Promise<Tree | null> {
  return parseSource("snippet.py", source)
}

function functionBody(tree: Tree): Node | null {
  return firstBlock(tree.rootNode)
}

function firstBlock(node: Node): Node | null {
  return node.type === "block" ? node : node.namedChildren.reduce<Node | null>((found, child) => found ?? firstBlock(child), null)
}

function stepType(nodeType: string): StepType {
  return STEP_TYPES[nodeType] ?? "other"
}

const block = (node: Node | null): Node[] => {
  if (node === null) return []
  return node.type === "block" ? [...node.namedChildren] : [node]
}

const blockIn = (clause: Node): Node[] => {
  const body = clause.namedChildren.find((child) => child.type === "block")
  return body === undefined ? [] : block(body)
}

const bodyArm = (label: string, node: Node): Arm => ({ label, nodes: block(node.childForFieldName("body")) })

function conditionalArm(child: Node): Arm[] {
  if (child.type === "elif_clause") return [{ label: "elif", nodes: block(child.childForFieldName("consequence")) }]
  return child.type === "else_clause" ? [bodyArm("else", child)] : []
}

function tryArm(child: Node): Arm[] {
  if (child.type === "except_clause" || child.type === "except_group_clause") return [{ label: "except", nodes: blockIn(child) }]
  if (child.type === "finally_clause") return [{ label: "finally", nodes: blockIn(child) }]
  return child.type === "else_clause" ? [bodyArm("else", child)] : []
}

function loopArms(node: Node): Arm[] {
  const alternative = node.childForFieldName("alternative")
  return [bodyArm("body", node), ...(alternative?.type === "else_clause" ? [bodyArm("else", alternative)] : [])]
}

function arms(node: Node): Arm[] {
  if (node.type === "if_statement") {
    return [{ label: "then", nodes: block(node.childForFieldName("consequence")) }, ...node.namedChildren.flatMap(conditionalArm)]
  }
  if (node.type === "for_statement" || node.type === "while_statement") return loopArms(node)
  if (node.type === "with_statement") return [bodyArm("body", node)]
  return node.type === "try_statement" ? [bodyArm("try", node), ...node.namedChildren.flatMap(tryArm)] : []
}

const isFunctionSource = (text: string): boolean => /\bdef\b|\blambda\b/.test(text)
const isCall = (afterReference: string): boolean => /^\s*\(/.test(afterReference)

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

const statementOf = (node: Node): Statement => ({
  type: stepType(node.type),
  lines: [node.startPosition.row + 1, node.endPosition.row + 1],
  text: node.text,
  range: rangeOf(node),
  arms: arms(node).map((arm) => ({ label: arm.label, statements: arm.nodes.map(statementOf) })),
})

async function statements(body: string): Promise<Statement[] | null> {
  const tree = await parse(body)
  if (tree === null) return null
  try {
    const holder = functionBody(tree) ?? tree.rootNode
    return holder.namedChildren.map(statementOf)
  } finally {
    tree.delete()
  }
}

export const pythonParser: LanguageParser & {
  parse: typeof parse
  functionBody: typeof functionBody
  stepType: typeof stepType
  arms: typeof arms
} = {
  id: "python",
  extensions: [".py", ".pyi"],
  statements,
  parse,
  functionBody,
  stepType,
  arms,
  isFunctionSource,
  isCall,
}
