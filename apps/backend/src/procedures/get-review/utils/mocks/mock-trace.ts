import { classificationOfType, diffKindsOf } from "@flightplan/codegraph"
import type { CodeBlock, CodeBlockClassification, CodeBlockType, JourneyFlowDiagram, JourneyNode, SourceFile } from "@flightplan/configurations"

export interface MockJourneyNode {
  readonly id: string
  readonly type: CodeBlockType
  readonly path: string
  readonly declaration: string
  readonly isChanged: boolean
  readonly label: string | null
  readonly description: string | null
  readonly triggers?: readonly MockTrigger[]
  readonly listedBlocks?: readonly MockTrigger[]
  readonly children?: readonly MockJourneyNode[]
}

export interface MockTrigger {
  readonly codeBlockId: string
  readonly type: CodeBlockType
  readonly name: string
  readonly label: string | null
}

export type MockJourneyEdge = readonly [from: string, to: string]

const FIRST_COLUMN = 1
const FIRST_LINE = 1
const EDGE_ID_SEPARATOR = " -> "
const FALLBACK_CLASSIFICATION: CodeBlockClassification = "logic"

const linesOf = (sources: readonly SourceFile[], path: string, declaration: string): readonly [number, number] => {
  const declarations = sources.find((source) => source.path === path)?.declarations ?? {}
  return Object.keys(declarations).includes(declaration) ? [declarations[declaration].lineStart, declarations[declaration].lineEnd] : [FIRST_LINE, FIRST_LINE]
}

interface MockBlock {
  readonly id: string
  readonly type: CodeBlockType
  readonly path: string
  readonly name: string
  readonly lines: readonly [number, number]
  readonly isChanged: boolean
}

const blockOf = ({ id, type, path, name, lines: [lineStart, lineEnd], isChanged }: MockBlock): CodeBlock => {
  const range = { start: { line: lineStart, column: FIRST_COLUMN }, end: { line: lineEnd, column: FIRST_COLUMN } }
  const classifications = [classificationOfType(type) ?? FALLBACK_CLASSIFICATION]
  return {
    id,
    name,
    type,
    lineOfCodeRangeReference: [range],
    parentBlock: null,
    childrenBlocks: [],
    isRoot: true,
    isExported: true,
    exportedBy: [],
    lineOfCodeDiffs: isChanged ? [range] : null,
    diffs: isChanged ? [{ type: "modified", range }] : [],
    diffSources: [],
    classifications,
    diffClassifications: isChanged ? classifications : [],
    outerSymbols: [],
    usedBy: [],
    nextBlocks: [],
    handedFrom: [],
    astGraph: { filePath: path, codeBlocks: [], rootBlocks: [], diffBlocks: [], diffContains: [], externalSymbols: [], externalBlocks: [], exports: new Map() },
    catalogue: null,
  }
}

const nodeOf = (mock: MockJourneyNode, sources: readonly SourceFile[]): JourneyNode => {
  const lines = linesOf(sources, mock.path, mock.declaration)
  const block = blockOf({ id: mock.id, type: mock.type, path: mock.path, name: mock.declaration, lines, isChanged: mock.isChanged })
  const triggerLabels = (mock.triggers ?? []).map(({ codeBlockId, type, name, label }) => ({
    label,
    codeBlock: blockOf({ id: codeBlockId, type, path: mock.path, name, lines, isChanged: false }),
  }))
  const blockLabels = (mock.listedBlocks ?? []).map(({ codeBlockId, type, name, label }) => ({
    label,
    codeBlock: blockOf({ id: codeBlockId, type, path: mock.path, name, lines, isChanged: false }),
  }))
  return {
    id: mock.id,
    type: mock.type,
    label: mock.label,
    description: mock.description,
    codeBlocks: [block, ...triggerLabels.map((trigger) => trigger.codeBlock)],
    diffCodeBlocks: mock.isChanged ? [block] : [],
    children: (mock.children ?? []).map((child) => nodeOf(child, sources)),
    triggerLabels,
    blockLabels,
  }
}

const listNodes = (nodes: readonly JourneyNode[]): JourneyNode[] => nodes.flatMap((node) => [node, ...listNodes(node.children)])

export const mockJourney = (
  sources: readonly SourceFile[],
  nodes: readonly MockJourneyNode[],
  edges: readonly MockJourneyEdge[],
  description: string | null = null,
): JourneyFlowDiagram => {
  const journeyNodes = nodes.map((node) => nodeOf(node, sources))
  const everyNode = listNodes(journeyNodes)
  const codeBlocks = everyNode.flatMap((node) => node.codeBlocks)
  return {
    astCodeGroup: {
      astGraphs: [],
      rootASTGraphs: [],
      codeBlocks,
      diffBlocks: everyNode.flatMap((node) => node.diffCodeBlocks),
      diffContains: diffKindsOf(everyNode.flatMap((node) => node.diffCodeBlocks.flatMap((block) => block.diffClassifications))),
      chainContains: [],
      diffChains: [],
    },
    importGraphGroup: [],
    description,
    journeyNodes,
    journeyNodeEdges: edges.map(([from, to]) => ({ id: [from, to].join(EDGE_ID_SEPARATOR), from, to })),
  }
}
