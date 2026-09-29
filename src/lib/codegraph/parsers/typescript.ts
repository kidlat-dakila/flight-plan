/**
 * The TypeScript / JavaScript language parser.
 *
 * Reads a function body's source into {@link Statement}s with acorn, and holds
 * the TS/JS call and function syntax. The step builder never names a syntax
 * node — it goes through this.
 *
 * The body is whole lines cut out of a file, read on its own, and its steps
 * must not change from when tree-sitter read it. So:
 * - it is read with TSX first and TypeScript second (for a `<T>` cast), and a
 *   class member's lines, which are not a statement on their own, inside a
 *   class;
 * - the statements are those of the first block in pre-order (the function's
 *   body), or of the whole source when there is none;
 * - comments are kept where tree-sitter kept them, as children of a block, a
 *   `case` and an `else`, because where an arm starts depends on them;
 * - a statement that ends without a semicolon runs on over the comments after
 *   it on the same line, as tree-sitter's automatic semicolon does.
 */
import { Parser } from "acorn"
import { tsPlugin } from "@sveltejs/acorn-typescript"
import type { Pos, Range, StepType } from "../types"
import { childrenOf, skipTrivia, type Node } from "../tracer/typescript/estree"
import type { Arm, LanguageParser, Statement } from "."

/** ESTree statement type → the generic {@link StepType}. */
const STEP_TYPES: Record<string, StepType> = {
  // declarations
  VariableDeclaration: "declaration",
  FunctionDeclaration: "declaration",
  ClassDeclaration: "declaration",
  TSTypeAliasDeclaration: "declaration",
  TSInterfaceDeclaration: "declaration",
  TSEnumDeclaration: "declaration",
  // straight-line
  ExpressionStatement: "expression",
  ReturnStatement: "return",
  ThrowStatement: "throw",
  BreakStatement: "jump",
  ContinueStatement: "jump",
  BlockStatement: "block",
  // control flow
  IfStatement: "conditional",
  SwitchStatement: "conditional",
  ForStatement: "loop",
  ForInStatement: "loop",
  ForOfStatement: "loop",
  WhileStatement: "loop",
  DoWhileStatement: "loop",
  TryStatement: "try",
  // recognised but uninteresting
  EmptyStatement: "other",
  DebuggerStatement: "other",
  LabeledStatement: "other",
}

/** A generator, an abstract class and an ambient `declare` were never declarations to tree-sitter. */
function stepType(node: Node): StepType {
  if (node.type === "FunctionDeclaration" && node.generator === true) return "other"
  if (node.type === "ClassDeclaration" && node.abstract === true) return "other"
  if (node.declare === true) return "other"
  return STEP_TYPES[node.type] ?? "other"
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

/** A class around a member's lines, so they read as a class body; it extends, so `super()` reads. */
const CLASS_OPEN = "class Snippet extends Object {\n"
const CLASS_CLOSE = "\n}"

type Comment = { start: number; end: number }

/** The statement a compound statement ends with, if it ends with one. */
function lastInner(node: Node): Node | null {
  switch (node.type) {
    case "IfStatement":
      return (node.alternate as Node | null) ?? (node.consequent as Node)
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "LabeledStatement":
      return node.body as Node
    default:
      return null
  }
}

/** The statements tree-sitter ends with an automatic semicolon when none is written. */
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

/** A body read on its own: the program, its comments, and where the body starts in the text read. */
type Snippet = { program: Node; comments: Comment[]; text: string; offset: number }

function read(body: string): Snippet | null {
  for (const [text, offset] of [[body, 0], [CLASS_OPEN + body + CLASS_CLOSE, CLASS_OPEN.length]] as const) {
    for (const parser of PARSERS) {
      const comments: Comment[] = []
      try {
        const program = parser.parse(text, { ...OPTIONS, onComment: (_block, _text, start, end) => comments.push({ start, end }) }) as unknown as Node
        return { program, comments, text, offset }
      } catch {
        // the next reading
      }
    }
  }
  return null
}

/** The first node in pre-order that is a statement block, or null. */
function firstBlock(node: Node): Node | null {
  for (const child of childrenOf(node)) {
    if (child.type === "BlockStatement" || child.type === "StaticBlock" || child.type === "TSModuleBlock") return child
    const found = firstBlock(child)
    if (found !== null) return found
  }
  return null
}

async function statements(body: string): Promise<Statement[] | null> {
  const snippet = read(body)
  if (snippet === null) return null
  const { program, comments, text, offset } = snippet

  const lineStarts = [0]
  for (let at = body.indexOf("\n"); at !== -1; at = body.indexOf("\n", at + 1)) lineStarts.push(at + 1)
  const positionAt = (index: number): Pos => {
    const at = index - offset
    let line = 0
    while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? 0) <= at) line++
    return { line: line + 1, column: at - (lineStarts[line] ?? 0) }
  }
  const rangeOf = (one: { start: number; end: number }): Range => ({ start: positionAt(one.start), end: positionAt(one.end) })

  /**
   * Where a statement ends as tree-sitter reads it: a statement without its
   * semicolon runs on over the comments after it on the same line.
   */
  const endOf = (node: Node): number => {
    // A compound statement ends where the statement it ends with ends.
    const last = lastInner(node)
    if (last !== null && last.end === node.end) return endOf(last)
    if (!SEMICOLON_ENDED.has(node.type) || text[node.end - 1] === ";") return node.end
    let end = node.end
    for (const comment of comments) {
      if (comment.start < end) continue
      if (!/^[ \t]*$/.test(text.slice(end, comment.start))) break
      end = comment.end
    }
    return end
  }

  /** The comments inside `[from, to)` that no statement of `nodes` holds, as statements. */
  const commentsBetween = (from: number, to: number, nodes: readonly Node[]): Statement[] =>
    comments
      .filter((c) => c.start >= from && c.end <= to && !nodes.some((n) => c.start >= n.start && c.end <= endOf(n)))
      .map((c) => ({
        type: "comment" as const,
        lines: [positionAt(c.start).line, positionAt(c.end).line] as [number, number],
        text: text.slice(c.start, c.end),
        range: rangeOf(c),
        arms: [],
      }))

  /** Statements and loose comments, in source order. */
  const merged = (nodes: readonly Node[], from: number, to: number): Statement[] =>
    [...nodes.map(statementOf), ...commentsBetween(from, to, nodes)].sort(
      (one, two) => one.range.start.line - two.range.start.line || one.range.start.column - two.range.start.column,
    )

  /** What a block holds; a single un-braced statement is itself. */
  const blockOf = (node: Node | null | undefined): Statement[] => {
    if (node === null || node === undefined) return []
    if (node.type !== "BlockStatement") return [statementOf(node)]
    return merged(node.body as Node[], node.start, node.end)
  }

  const armsOf = (node: Node): Arm[] => {
    switch (node.type) {
      case "IfStatement": {
        const out: Arm[] = [{ label: "then", statements: blockOf(node.consequent as Node) }]
        const alternate = node.alternate as Node | null
        if (alternate !== null) {
          // `else { … }` → its statements; `else if (…)` → the nested if. A
          // comment after `else` belongs to the else.
          const afterElse = skipTrivia(text, (node.consequent as Node).end) + "else".length
          const loose = commentsBetween(afterElse, alternate.start, [])
          out.push({ label: "else", statements: [...loose, ...blockOf(alternate)] })
        }
        return out
      }
      case "SwitchStatement":
        return (node.cases as Node[]).map((one) => {
          const test = one.test as Node | null
          const body = one.consequent as Node[]
          return {
            label: test === null ? "default" : `case ${text.slice(test.start, test.end)}`.trim(),
            statements: merged(body, test === null ? one.start : test.end, one.end),
          }
        })
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement":
      case "WhileStatement":
      case "DoWhileStatement":
        return [{ label: "body", statements: blockOf(node.body as Node) }]
      case "TryStatement": {
        const out: Arm[] = [{ label: "try", statements: blockOf(node.block as Node) }]
        const handler = node.handler as Node | null
        if (handler !== null) out.push({ label: "catch", statements: blockOf(handler.body as Node) })
        const finalizer = node.finalizer as Node | null
        if (finalizer !== null) out.push({ label: "finally", statements: blockOf(finalizer) })
        return out
      }
      default:
        return []
    }
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
  if (block !== null) return merged((block.body as Node[]) ?? [], block.start, block.end)
  // A class member with no block was read inside a class: its own lines are
  // not statements, so there is nothing to step through.
  if (offset > 0) return []
  return merged(program.body as Node[], 0, text.length)
}

const isFunctionSource = (source: string): boolean => /=>|\bfunction\b/.test(source)

const isCall = (afterReference: string): boolean => /^\s*\(/.test(afterReference)

export const typescriptParser: LanguageParser = {
  id: "typescript",
  extensions: [".ts", ".mts", ".cts", ".tsx", ".jsx", ".js", ".mjs", ".cjs"],
  statements,
  isFunctionSource,
  isCall,
}
