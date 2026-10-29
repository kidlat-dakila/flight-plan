import { parseWithGrammar, type SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"
import { withReturns } from "@/code-blocks/languages/returns"
import { FUNCTION_TYPES } from "@/code-blocks/languages/typescript/markup"
import type { ReadBlock } from "@/code-blocks/reading"
import { rangeOfNode } from "@/code-blocks/source-range"

const LONG_CHAIN = 5000
const LONG_CHAIN_TIMEOUT_MS = 20_000
const SHORT_CHAIN = 20
const FUNCTION_ID = "pick"
const RETURN_KEYWORD = "return"
const FIRST_LINE = 1
const FIRST_COLUMN = 1

const elseIfChainOf = (length: number): string =>
  [
    "function pick(level) {",
    "  if (level === 0) {",
    ...Array.from({ length: length - 1 }, (_, index) => `  } else if (level === ${String(index + 1)}) {`),
    "    return level",
    "  }",
    "}",
  ].join("\n")

const returningChainLinesOf = (length: number): string[] => [
  "function pick(level) {",
  "  if (level === 0) { return 0 }",
  ...Array.from({ length: length - 1 }, (_, index) => `  else if (level === ${String(index + 1)}) { return ${String(index + 1)} }`),
  "  return -1",
  "}",
]

const returnStartsOf = (lines: readonly string[]): { line: number, column: number }[] =>
  lines.flatMap((text, index) => (text.includes(RETURN_KEYWORD) ? [{ line: index + FIRST_LINE, column: text.indexOf(RETURN_KEYWORD) + FIRST_COLUMN }] : []))

const nodesOfType = (root: SyntaxNode, type: string): SyntaxNode[] =>
  collectFromNode(root, (node) => ({ found: node.type === type ? [node] : [], shouldDescend: true }))

const conditionIdAt = (index: number): string => `condition-${String(index)}`

const blockOf = (id: string, type: ReadBlock["type"], node: SyntaxNode, parentId: string | null): ReadBlock => ({
  id,
  type,
  ranges: [rangeOfNode(node)],
  parentId,
  declaredAt: [],
})

const chainBlocksOf = (root: SyntaxNode): ReadBlock[] => [
  blockOf(FUNCTION_ID, "function", nodesOfType(root, "function_declaration")[0], null),
  ...nodesOfType(root, "if_statement").map((node, index) => blockOf(conditionIdAt(index), "condition", node, index === 0 ? FUNCTION_ID : conditionIdAt(index - 1))),
]

describe("withReturns on an else if chain", () => {
  it("gives the return at the end of a chain nested deeper than a call stack holds to its last condition", () => {
    const { rootNode } = parseWithGrammar("typescript", elseIfChainOf(LONG_CHAIN))

    const returned = withReturns(chainBlocksOf(rootNode), rootNode, FUNCTION_TYPES).filter((block) => block.returnsAt !== undefined)

    expect(returned.map(({ id, returnsAt }) => [id, returnsAt])).toStrictEqual([[conditionIdAt(LONG_CHAIN - 1), [{ line: LONG_CHAIN + 2, column: 5 }]]])
  }, LONG_CHAIN_TIMEOUT_MS)

  it("gives the return of each branch to its own condition and the return after the chain to the function", () => {
    const lines = returningChainLinesOf(SHORT_CHAIN)
    const { rootNode } = parseWithGrammar("typescript", lines.join("\n"))
    const starts = returnStartsOf(lines)

    const returned = withReturns(chainBlocksOf(rootNode), rootNode, FUNCTION_TYPES).filter((block) => block.returnsAt !== undefined)

    expect(returned.map(({ id, returnsAt }) => [id, returnsAt])).toStrictEqual([
      [FUNCTION_ID, starts.slice(SHORT_CHAIN)],
      ...starts.slice(0, SHORT_CHAIN).map((start, index) => [conditionIdAt(index), [start]]),
    ])
  })
})
