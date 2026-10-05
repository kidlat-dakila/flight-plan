import { tsPlugin } from "@sveltejs/acorn-typescript"
import { Parser, type Comment as AcornComment } from "acorn"
import { childrenOf, skipTrivia } from "@/core/tracer/typescript/estree"
import { childAt, childrenAt, isNode, type Node } from "@/core/tracer/typescript/node"
import type { Pos, Range, StepType } from "@/core/types"
import type { Arm, LanguageParser, Statement } from "."

const STEP_TYPES: ReadonlyMap<string, StepType> = new Map([
  ["VariableDeclaration", "declaration"],
  ["FunctionDeclaration", "declaration"],
  ["ClassDeclaration", "declaration"],
  ["TSTypeAliasDeclaration", "declaration"],
  ["TSInterfaceDeclaration", "declaration"],
  ["TSEnumDeclaration", "declaration"],
  ["ExpressionStatement", "expression"],
  ["ReturnStatement", "return"],
  ["ThrowStatement", "throw"],
  ["BreakStatement", "jump"],
  ["ContinueStatement", "jump"],
  ["BlockStatement", "block"],
  ["IfStatement", "conditional"],
  ["SwitchStatement", "conditional"],
  ["ForStatement", "loop"],
  ["ForInStatement", "loop"],
  ["ForOfStatement", "loop"],
  ["WhileStatement", "loop"],
  ["DoWhileStatement", "loop"],
  ["TryStatement", "try"],
  ["EmptyStatement", "other"],
  ["DebuggerStatement", "other"],
  ["LabeledStatement", "other"],
])

function stepType(node: Node): StepType {
  if (node.type === "FunctionDeclaration" && node.generator === true) return "other"
  if (node.type === "ClassDeclaration" && node.abstract === true) return "other"
  if (node.declare === true) return "other"
  return STEP_TYPES.get(node.type) ?? "other"
}

const OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
  preserveParens: true,
  allowHashBang: true,
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
} as const

const PARSERS = [Parser.extend(tsPlugin({ jsx: true })), Parser.extend(tsPlugin())]

const CLASS_OPEN = "class Snippet extends Object {\n"
const CLASS_CLOSE = "\n}"
const BLANK = /^[ \t]*$/
const LOOPS = new Set(["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement"])
const BLOCKS = new Set(["BlockStatement", "StaticBlock", "TSModuleBlock"])

interface Comment { start: number, end: number }

function lastInner(node: Node): Node | null {
  if (node.type === "IfStatement") return childAt(node, "alternate") ?? childAt(node, "consequent")
  return LOOPS.has(node.type) || node.type === "LabeledStatement" ? childAt(node, "body") : null
}

const SEMICOLON_ENDED = new Set([
  "ExpressionStatement",
  "VariableDeclaration",
  "ReturnStatement",
  "ThrowStatement",
  "BreakStatement",
  "ContinueStatement",
  "DebuggerStatement",
  "TSTypeAliasDeclaration",
  "DoWhileStatement",
])

interface Snippet { program: Node, comments: readonly Comment[], text: string, offset: number }

interface Attempt { parser: typeof Parser, text: string, offset: number }

function readWith({ parser, text, offset }: Attempt): Snippet | null {
  const comments: AcornComment[] = []
  try {
    const program: unknown = parser.parse(text, { ...OPTIONS, onComment: comments })
    return isNode(program) ? { program, comments, text, offset } : null
  } catch {
    return null
  }
}

function read(body: string): Snippet | null {
  const sources = [{ text: body, offset: 0 }, { text: CLASS_OPEN + body + CLASS_CLOSE, offset: CLASS_OPEN.length }]
  return sources
    .flatMap((source) => PARSERS.map((parser) => ({ parser, ...source })))
    .reduce<Snippet | null>((found, attempt) => found ?? readWith(attempt), null)
}

function firstBlock(node: Node): Node | null {
  return childrenOf(node).reduce<Node | null>((found, child) => found ?? (BLOCKS.has(child.type) ? child : firstBlock(child)), null)
}

function readStatements(body: string): Statement[] | null {
  const snippet = read(body)
  if (snippet === null) return null
  const { program, comments, text, offset } = snippet

  const lineStarts = [0, ...[...body.matchAll(/\n/g)].map((match) => match.index + 1)]
  const positionAt = (index: number): Pos => {
    const at = index - offset
    const line = Math.max(0, lineStarts.filter((start) => start <= at).length - 1)
    return { line: line + 1, column: at - (lineStarts[line] ?? 0) }
  }
  const rangeOf = (one: { start: number, end: number }): Range => ({ start: positionAt(one.start), end: positionAt(one.end) })

  const endWithTrailingComments = (from: number): number =>
    comments.reduce<{ end: number, isClosed: boolean }>(
      (held, comment) => {
        if (held.isClosed || comment.start < held.end) return held
        return BLANK.test(text.slice(held.end, comment.start)) ? { end: comment.end, isClosed: false } : { ...held, isClosed: true }
      },
      { end: from, isClosed: false },
    ).end

  const endOf = (node: Node): number => {
    const last = lastInner(node)
    if (last !== null && last.end === node.end) return endOf(last)
    return !SEMICOLON_ENDED.has(node.type) || text[node.end - 1] === ";" ? node.end : endWithTrailingComments(node.end)
  }

  const commentsBetween = (from: number, to: number, nodes: readonly Node[]): Statement[] =>
    comments
      .filter((c) => c.start >= from && c.end <= to && !nodes.some((n) => c.start >= n.start && c.end <= endOf(n)))
      .map((c): Statement => ({
        type: "comment",
        lines: [positionAt(c.start).line, positionAt(c.end).line],
        text: text.slice(c.start, c.end),
        range: rangeOf(c),
        arms: [],
      }))

  const merged = (nodes: readonly Node[], from: number, to: number): Statement[] =>
    [...nodes.map(statementOf), ...commentsBetween(from, to, nodes)].sort(
      (one, two) => one.range.start.line - two.range.start.line || one.range.start.column - two.range.start.column,
    )

  const blockOf = (node: Node | null): Statement[] => {
    if (node === null) return []
    return node.type === "BlockStatement" ? merged(childrenAt(node, "body"), node.start, node.end) : [statementOf(node)]
  }

  const elseArmOf = (consequent: Node | null, alternate: Node | null): Arm[] => {
    if (alternate === null) return []
    const afterElse = skipTrivia(text, consequent?.end ?? alternate.start) + "else".length
    return [{ label: "else", statements: [...commentsBetween(afterElse, alternate.start, []), ...blockOf(alternate)] }]
  }

  const caseArmOf = (one: Node): Arm => {
    const test = childAt(one, "test")
    return {
      label: test === null ? "default" : `case ${text.slice(test.start, test.end)}`.trim(),
      statements: merged(childrenAt(one, "consequent"), test === null ? one.start : test.end, one.end),
    }
  }

  const tryArmsOf = (node: Node): Arm[] => {
    const handler = childAt(node, "handler")
    const finalizer = childAt(node, "finalizer")
    return [
      { label: "try", statements: blockOf(childAt(node, "block")) },
      ...(handler === null ? [] : [{ label: "catch", statements: blockOf(childAt(handler, "body")) }]),
      ...(finalizer === null ? [] : [{ label: "finally", statements: blockOf(finalizer) }]),
    ]
  }

  const armsOf = (node: Node): Arm[] => {
    if (node.type === "IfStatement") {
      const consequent = childAt(node, "consequent")
      return [{ label: "then", statements: blockOf(consequent) }, ...elseArmOf(consequent, childAt(node, "alternate"))]
    }
    if (node.type === "SwitchStatement") return childrenAt(node, "cases").map(caseArmOf)
    if (LOOPS.has(node.type) || node.type === "DoWhileStatement") return [{ label: "body", statements: blockOf(childAt(node, "body")) }]
    return node.type === "TryStatement" ? tryArmsOf(node) : []
  }

  function statementOf(node: Node): Statement {
    const end = endOf(node)
    return {
      type: stepType(node),
      lines: [positionAt(node.start).line, positionAt(end).line],
      text: text.slice(node.start, end),
      range: rangeOf({ start: node.start, end }),
      arms: armsOf(node),
    }
  }

  const block = firstBlock(program)
  if (block !== null) return merged(childrenAt(block, "body"), block.start, block.end)
  return offset > 0 ? [] : merged(childrenAt(program, "body"), 0, text.length)
}

const isFunctionSource = (source: string): boolean => /=>|\bfunction\b/.test(source)

const isCall = (afterReference: string): boolean => /^\s*\(/.test(afterReference)

export const typescriptParser: LanguageParser = {
  id: "typescript",
  extensions: [".ts", ".mts", ".cts", ".tsx", ".jsx", ".js", ".mjs", ".cjs"],
  statements: async (body) => await Promise.resolve(readStatements(body)),
  isFunctionSource,
  isCall,
}
