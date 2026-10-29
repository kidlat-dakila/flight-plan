import { classificationOfType, diffKindsOf } from "@flightplan/codegraph"
import type {
  BlockLabel,
  CodeBlock,
  CodeBlockClassification,
  CodeBlockType,
  Position,
  SourceFile,
  SourceRange,
  TraceDiagram,
  TraceNode,
} from "@flightplan/configurations"

export interface MockTraceNode {
  readonly id: string
  readonly type: CodeBlockType
  readonly path: string
  readonly declaration: string
  readonly isChanged: boolean
  readonly label: string | null
  readonly description: string | null
  readonly triggers?: readonly MockTrigger[]
  readonly listedBlocks?: readonly MockListedBlock[]
  readonly children?: readonly MockTraceNode[]
}

export interface MockTrigger {
  readonly codeBlockId: string
  readonly type: CodeBlockType
  readonly name: string
  readonly label: string | null
}

export interface MockListedBlock extends MockTrigger {
  readonly at?: Position
  readonly range?: SourceRange
}

export type MockTraceEdge = readonly [from: string, to: string]

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
  readonly range?: SourceRange | undefined
  readonly isChanged: boolean
}

const rangeOfLines = ([lineStart, lineEnd]: readonly [number, number]): SourceRange =>
  ({ start: { line: lineStart, column: FIRST_COLUMN }, end: { line: lineEnd, column: FIRST_COLUMN } })

const blockOf = ({ id, type, path, name, lines, range = rangeOfLines(lines), isChanged }: MockBlock): CodeBlock => {
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

const listedBlockOf = ({ codeBlockId, type, name, range }: MockListedBlock, path: string, lines: readonly [number, number]): CodeBlock =>
  blockOf({ id: codeBlockId, type, path, name, lines, range, isChanged: false })

const nodeOf = (mock: MockTraceNode, sources: readonly SourceFile[]): TraceNode => {
  const lines = linesOf(sources, mock.path, mock.declaration)
  const block = blockOf({ id: mock.id, type: mock.type, path: mock.path, name: mock.declaration, lines, isChanged: mock.isChanged })
  const triggerLabels = (mock.triggers ?? []).map(({ codeBlockId, type, name, label }) => ({
    label,
    codeBlock: blockOf({ id: codeBlockId, type, path: mock.path, name, lines, isChanged: false }),
  }))
  const blockLabels = (mock.listedBlocks ?? []).map((listed): BlockLabel => {
    const codeBlock = listedBlockOf(listed, mock.path, lines)
    return listed.at === undefined ? { label: listed.label, codeBlock } : { label: listed.label, codeBlock, at: listed.at }
  })
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
    isRequired: true,
  }
}

const listNodes = (nodes: readonly TraceNode[]): TraceNode[] => nodes.flatMap((node) => [node, ...listNodes(node.children)])

export interface MockTraceWriting {
  readonly title: string | null
  readonly description: string | null
}

const UNWRITTEN_TRACE: MockTraceWriting = { title: null, description: null }

export const mockTrace = (
  sources: readonly SourceFile[],
  nodes: readonly MockTraceNode[],
  edges: readonly MockTraceEdge[],
  { title, description }: MockTraceWriting = UNWRITTEN_TRACE,
): TraceDiagram => {
  const traceNodes = nodes.map((node) => nodeOf(node, sources))
  const everyNode = listNodes(traceNodes)
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
    title,
    description,
    traceNodes,
    traceNodeEdges: edges.map(([from, to]) => ({ id: [from, to].join(EDGE_ID_SEPARATOR), from, to })),
    isRequired: true,
  }
}
