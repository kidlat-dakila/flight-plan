import { readCodeGroup } from "@/code-blocks/build-group"
import { linkCodeGroupGraph } from "@/code-blocks/link-group"
import { FIRST_COLUMN } from "@/code-blocks/source-range"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "@/journey/names"
import { languageOf } from "@/scaffold/review-artifact"
import { buildSourceLines } from "@/scaffold/source-lines"
import { firstOfEach } from "@/shared/first-of-each"
import type { ASTCodeGroupGraph, ASTGraph, CodeBlock, CodeBlockType, JourneyFlowDiagram, JourneyNode, JourneyRow, LineRange, SourceFile } from "@flightplan/configurations"
import { listListedBlocks } from "./listed-blocks"
import { nodeBlockAround } from "./node-blocks"
import { toJourneyNode } from "."

export interface CardBlock {
  readonly id: string
  readonly name: string
  readonly type: CodeBlockType
  readonly typeLabel: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly childComponentNames: readonly string[]
}

export interface CardOptions {
  readonly isPrefilled: boolean
  readonly hasChildComponents: boolean
  readonly heldCardIds: ReadonlySet<string>
}

const COMPONENT: CodeBlockType = "component"
const IMPORT: CodeBlockType = "import"
const WHOLE_FILE: CodeBlockType = "file"
const RENDER = "render"
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const NO_IMPORTED_FILE_PATHS: ReadonlyMap<string, string> = new Map()
const NO_ROWS: readonly JourneyRow[] = []
const EMPTY_GROUP: ASTCodeGroupGraph = {
  astGraphs: [],
  rootASTGraphs: [],
  codeBlocks: [],
  diffBlocks: [],
  diffContains: [],
  chainContains: [],
  diffChains: [],
}
const NO_CHANGE = { added: [], removed: [], isCreated: false }

export const createEmptyJourney = (): JourneyFlowDiagram => ({
  astCodeGroup: EMPTY_GROUP,
  importGraphGroup: [],
  description: null,
  journeyNodes: [],
  journeyNodeEdges: [],
})

export const readFileGraph = (filePath: string, source: string): ASTGraph | null => {
  const { group } = readCodeGroup([{ filePath, source, importedBy: [], importedFilePaths: NO_IMPORTED_FILE_PATHS, diffs: [] }])
  return linkCodeGroupGraph(group).astGraphs.find((astGraph) => astGraph.filePath === filePath) ?? null
}

export const sourceFileOf = (path: string, text: string): SourceFile => ({
  path,
  language: languageOf(path),
  lines: buildSourceLines(text, NO_CHANGE),
  declarations: {},
  references: [],
  languageReferences: [],
})

const lineRangeOfBlocks = (blocks: readonly CodeBlock[]): LineRange => {
  const ranges = blocks.flatMap((block) => block.lineOfCodeRangeReference)
  return {
    lineStart: Math.min(...ranges.map((range) => range.start.line)),
    lineEnd: Math.max(...ranges.map((range) => range.end.line)),
  }
}

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const listRenderedComponents = (block: CodeBlock): CodeBlock[] =>
  firstOfEach(
    listBlocksWithin(block)
      .flatMap((inside) => inside.outerSymbols)
      .flatMap((symbol) =>
        (symbol.type === "internal-code-block" || symbol.type === "external-block") && symbol.use === RENDER && symbol.codeBlockReference.type === COMPONENT
          ? [symbol.codeBlockReference]
          : []),
    (component) => component.id,
  ).filter((component) => component.id !== block.id)

const inLineOrder = (rows: readonly JourneyRow[]): JourneyRow[] =>
  [...rows].sort((one, two) => one.lineStart - two.lineStart || one.lineEnd - two.lineEnd)

const toRow = (block: CodeBlock, statements: readonly CodeBlock[]): JourneyRow => ({
  id: block.id,
  type: block.type,
  label: null,
  ...lineRangeOfBlocks(statements),
})

const listInsideBlocks = (nodeBlock: CodeBlock): CodeBlock[] =>
  listBlocksWithin(nodeBlock).filter((block) => block.id !== nodeBlock.id && nodeBlockAround(block)?.id === nodeBlock.id)

const prefillRows = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): JourneyRow[] =>
  inLineOrder(
    firstOfEach(
      [
        ...listListedBlocks(nodeBlock, insideBlocks).map(({ block, statements }) => toRow(block, statements)),
        ...insideBlocks.filter((block) => TRIGGER_TYPES.has(block.type)).map((block) => toRow(block, [block])),
      ],
      (row) => row.id,
    ),
  )

export const listCardRows = (node: JourneyNode): JourneyRow[] => {
  if (node.rows !== undefined) return inLineOrder(node.rows)
  const [nodeBlock, ...insideBlocks] = node.codeBlocks
  const writtenById = new Map([...node.blockLabels, ...node.triggerLabels].map(({ label, codeBlock }) => [codeBlock.id, label] as const))
  const rows = firstOfEach(
    [
      ...listListedBlocks(nodeBlock, insideBlocks).map(({ block, statements }) => toRow(block, statements)),
      ...node.triggerLabels.map(({ codeBlock }) => toRow(codeBlock, [codeBlock])),
    ],
    (row) => row.id,
  )
  return inLineOrder(rows.map((row) => ({ ...row, label: writtenById.get(row.id) ?? null })))
}

export const nameOfCardRow = (node: JourneyNode, row: JourneyRow): string => {
  const block = node.codeBlocks.find((candidate) => candidate.id === row.id)
  return block === undefined ? linesLabelOf(row) : nameOfBlock(block)
}

export const listCardBlocks = (astGraph: ASTGraph): CardBlock[] =>
  astGraph.rootBlocks
    .filter((block) => block.type !== IMPORT)
    .map((block) => ({
      id: block.id,
      name: nameOfBlock(block),
      type: block.type,
      typeLabel: BLOCK_TYPE_LABELS[block.type],
      ...lineRangeOfBlocks([block]),
      childComponentNames: block.type === COMPONENT ? listRenderedComponents(block).map(nameOfBlock) : [],
    }))
    .sort((one, two) => one.lineStart - two.lineStart)

export const buildBlockCard = (block: CodeBlock, options: CardOptions): JourneyNode => {
  const insideBlocks = listInsideBlocks(block)
  const heldCardIds = new Set([...options.heldCardIds, block.id])
  const childComponents = options.hasChildComponents && block.type === COMPONENT
    ? listRenderedComponents(block).filter((component) => !heldCardIds.has(component.id))
    : []
  const idsHeldWithSiblings = new Set([...heldCardIds, ...childComponents.map((component) => component.id)])
  return {
    ...toJourneyNode(block, insideBlocks),
    triggerLabels: [],
    blockLabels: [],
    rows: options.isPrefilled ? prefillRows(block, insideBlocks) : NO_ROWS,
    children: childComponents.map((component) => buildBlockCard(component, { ...options, heldCardIds: idsHeldWithSiblings })),
  }
}

const isWithinLines = (block: CodeBlock, { lineStart, lineEnd }: LineRange): boolean => {
  const lines = lineRangeOfBlocks([block])
  return lines.lineStart >= lineStart && lines.lineEnd <= lineEnd
}

const holdsLines = (block: CodeBlock, { lineStart, lineEnd }: LineRange): boolean => {
  const lines = lineRangeOfBlocks([block])
  return lines.lineStart <= lineStart && lines.lineEnd >= lineEnd
}

const lineCountOf = (block: CodeBlock): number => {
  const { lineStart, lineEnd } = lineRangeOfBlocks([block])
  return lineEnd - lineStart
}

const typeOfLines = (astGraph: ASTGraph, lines: LineRange): CodeBlockType => {
  const holders = astGraph.codeBlocks.filter((block) => holdsLines(block, lines)).sort((one, two) => lineCountOf(one) - lineCountOf(two))
  return holders.length === 0 ? WHOLE_FILE : holders[0].type
}

export const linesCardIdOf = (filePath: string, { lineStart, lineEnd }: LineRange): string =>
  `${filePath}#lines@${String(lineStart)}:${String(lineEnd)}`

export const linesLabelOf = ({ lineStart, lineEnd }: LineRange): string =>
  lineStart === lineEnd ? `Line ${String(lineStart)}` : `Lines ${String(lineStart)} to ${String(lineEnd)}`

const blockOfLines = (astGraph: ASTGraph, lines: LineRange): CodeBlock => ({
  id: linesCardIdOf(astGraph.filePath, lines),
  name: linesLabelOf(lines),
  type: typeOfLines(astGraph, lines),
  lineOfCodeRangeReference: [{ start: { line: lines.lineStart, column: FIRST_COLUMN }, end: { line: lines.lineEnd, column: FIRST_COLUMN } }],
  parentBlock: null,
  childrenBlocks: [],
  isRoot: true,
  isExported: false,
  exportedBy: [],
  lineOfCodeDiffs: null,
  diffs: [],
  diffSources: [],
  outerSymbols: [],
  usedBy: [],
  nextBlocks: [],
  handedFrom: [],
  astGraph,
  catalogue: null,
})

export const buildLinesCard = (astGraph: ASTGraph, lines: LineRange, isPrefilled: boolean): JourneyNode => {
  const block = blockOfLines(astGraph, lines)
  const blocksWithin = astGraph.codeBlocks.filter((inside) => isWithinLines(inside, lines))
  const outermost = blocksWithin.filter((inside) => inside.parentBlock === null || !isWithinLines(inside.parentBlock, lines))
  return {
    id: block.id,
    type: block.type,
    label: null,
    description: null,
    codeBlocks: [block, ...blocksWithin],
    diffCodeBlocks: blocksWithin.filter((inside) => inside.lineOfCodeDiffs !== null),
    children: [],
    triggerLabels: [],
    blockLabels: [],
    rows: isPrefilled ? inLineOrder(outermost.map((inside) => toRow(inside, [inside]))) : NO_ROWS,
  }
}
