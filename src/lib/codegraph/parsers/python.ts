/**
 * The Python language parser.
 *
 * Everything that knows tree-sitter-python's node names and field names and
 * Python's call and function syntax lives here. The generic builders never
 * name a grammar node — they go through this. See `parsers/typescript.ts` for
 * the precedent this mirrors.
 */
import type { Node, Tree } from "web-tree-sitter"
import { parseSource } from "../tracer/parse"
import type { Range, StepType } from "../types"
import type { LanguageParser, Statement } from "."

/** One arm of a branching node, as tree-sitter nodes. */
type Arm = { label: string; nodes: Node[] }

/** tree-sitter-python node type → the generic {@link StepType}. */
const STEP_TYPES: Record<string, StepType> = {
  // declarations
  function_definition: "declaration",
  class_definition: "declaration",
  import_statement: "declaration",
  import_from_statement: "declaration",
  global_statement: "declaration",
  nonlocal_statement: "declaration",
  // straight-line
  expression_statement: "expression",
  return_statement: "return",
  raise_statement: "throw",
  break_statement: "jump",
  continue_statement: "jump",
  pass_statement: "other",
  // control flow
  if_statement: "conditional",
  match_statement: "conditional",
  for_statement: "loop",
  while_statement: "loop",
  try_statement: "try",
  with_statement: "block",
  // dropped later
  comment: "comment",
}

async function parse(source: string): Promise<Tree | null> {
  return parseSource("snippet.py", source)
}

function functionBody(tree: Tree): Node | null {
  return firstBlock(tree.rootNode)
}

function firstBlock(node: Node): Node | null {
  if (node.type === "block") return node
  for (const child of node.namedChildren) {
    if (child === null) continue
    const found = firstBlock(child)
    if (found !== null) return found
  }
  return null
}

function stepType(nodeType: string): StepType {
  return STEP_TYPES[nodeType] ?? "other"
}

// A python suite is always a `block`; unwrap it to its statements.
const block = (n: Node | null): Node[] =>
  n === null ? [] : n.type === "block" ? [...n.namedChildren].filter((c): c is Node => c !== null) : [n]

function arms(node: Node): Arm[] {
  switch (node.type) {
    case "if_statement": {
      const out: Arm[] = [{ label: "then", nodes: block(node.childForFieldName("consequence")) }]
      // elif_clause/else_clause sit flat under if_statement — tree-sitter-python
      // does not nest a chain of elifs — so `childrenForFieldName("alternative")`
      // would also return them in order. Scanning namedChildren and matching by
      // type is a deliberate preference to keep this parser off the plural
      // field-query API, not a workaround for a missing one.
      for (const child of node.namedChildren) {
        if (child === null) continue
        if (child.type === "elif_clause") {
          out.push({ label: "elif", nodes: block(child.childForFieldName("consequence")) })
        } else if (child.type === "else_clause") {
          out.push({ label: "else", nodes: block(child.childForFieldName("body")) })
        }
      }
      return out
    }
    case "for_statement":
    case "while_statement": {
      const out: Arm[] = [{ label: "body", nodes: block(node.childForFieldName("body")) }]
      const alt = node.childForFieldName("alternative") // for/while..else
      if (alt !== null && alt.type === "else_clause") {
        out.push({ label: "else", nodes: block(alt.childForFieldName("body")) })
      }
      return out
    }
    case "with_statement":
      return [{ label: "body", nodes: block(node.childForFieldName("body")) }]
    case "try_statement": {
      const out: Arm[] = [{ label: "try", nodes: block(node.childForFieldName("body")) }]
      for (const child of node.namedChildren) {
        if (child === null) continue
        if (child.type === "except_clause" || child.type === "except_group_clause") {
          out.push({ label: "except", nodes: blockIn(child) })
        } else if (child.type === "finally_clause") {
          out.push({ label: "finally", nodes: blockIn(child) })
        } else if (child.type === "else_clause") {
          out.push({ label: "else", nodes: block(child.childForFieldName("body")) })
        }
      }
      return out
    }
    default:
      return []
  }
}

// except_clause/finally_clause hold their suite as a `block` child (no field name).
const blockIn = (clause: Node): Node[] => {
  const body = clause.namedChildren.find((c): c is Node => c !== null && c.type === "block")
  return body === undefined ? [] : block(body)
}

const isFunctionSource = (text: string): boolean => /\bdef\b|\blambda\b/.test(text)
const isCall = (afterReference: string): boolean => /^\s*\(/.test(afterReference)

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

/** A tree-sitter node as a {@link Statement}, its arms read with {@link arms}. */
const statementOf = (node: Node): Statement => ({
  type: stepType(node.type),
  lines: [node.startPosition.row + 1, node.endPosition.row + 1],
  text: node.text,
  range: rangeOf(node),
  arms: arms(node).map((arm) => ({ label: arm.label, statements: arm.nodes.map(statementOf) })),
})

/** The statements of the first block, or of the whole source when it has none. */
async function statements(body: string): Promise<Statement[] | null> {
  const tree = await parse(body)
  if (tree === null) return null
  try {
    const block = functionBody(tree) ?? tree.rootNode
    return block.namedChildren.filter((child): child is Node => child !== null).map(statementOf)
  } finally {
    tree.delete()
  }
}

/** The tree-sitter parts stay reachable for their own tests. */
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
