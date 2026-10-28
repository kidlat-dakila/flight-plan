import { waypointsOf, type LocatedWaypoint } from "@/procedures/read-artifact/utils/artifact-walk"
import { describeBlockLabels } from "@/procedures/read-artifact/utils/block-label-rows"
import { lineRangeOfBlock, nameOfContext, pathOfBlock, placeOfBlock } from "@/procedures/read-artifact/utils/context-code-blocks"
import { coverCode, coverRange, type CoveredCode } from "@/procedures/read-artifact/utils/covered-code"
import { hasDrawnTrace, type Work, type WorkKind, type WorkTarget } from "@/procedures/read-artifact/utils/unwritten-work"
import { contextIdOf, flattenTraceNodes, listCarriedImports, listTraceNodes, nameOfBlock, type FlatTraceNode } from "@flightplan/codegraph"
import type { BlastNode, CodeBlock, ContextCodeBlock, TraceNode, LineRange, ReviewArtifact, Segment, SourceFile } from "@flightplan/configurations"

export interface NodeItem {
  readonly kind: WorkTarget | "unknown"
  readonly id: string | null
  readonly segmentId: string | null
  readonly needs: readonly WorkKind[]
  readonly file: string | null
  readonly node: unknown
  readonly lineage: readonly unknown[]
  readonly code: CoveredCode | null
}

interface Candidate {
  readonly kind: WorkTarget
  readonly id: string | null
  readonly segmentId: string | null
  readonly describe: (sources: readonly SourceFile[], maxLineCount: number) => Pick<NodeItem, "file" | "node" | "lineage" | "code">
}

const waypointCandidate = ({ segment, file, waypoint, ancestors }: LocatedWaypoint): Candidate => ({
  kind: "waypoint",
  id: waypoint.id,
  segmentId: segment.id,
  describe: (sources, maxLineCount) => ({
    file: file.path,
    node: {
      declaration: waypoint.declaration,
      codeBlockIds: waypoint.codeBlocks.map((block) => block.id),
      title: waypoint.title,
      reading: waypoint.reading,
      coreChange: waypoint.coreChange,
      findings: waypoint.findings,
      childIds: waypoint.children.map((child) => child.id),
    },
    lineage: ancestors.map((ancestor) => ({ id: ancestor.id, declaration: ancestor.declaration, title: ancestor.title })),
    code: coverCode(sources, file.path, waypoint.declaration, maxLineCount),
  }),
})

const lineRangeOf = ({ codeBlocks: [root] }: TraceNode): LineRange => {
  const [{ start, end }] = root.lineOfCodeRangeReference
  return { lineStart: start.line, lineEnd: end.line }
}

const traceLineageOf = (node: FlatTraceNode, flatNodes: readonly FlatTraceNode[]): unknown[] => {
  const parent = flatNodes.find((candidate) => candidate.id === node.parentId)
  return parent === undefined ? [] : [...traceLineageOf(parent, flatNodes), { id: parent.id, type: parent.type, label: parent.label }]
}

const traceCandidates = (segment: Segment): Candidate[] => {
  const nodes = listTraceNodes(segment.traceDiagram?.traceNodes ?? [])
  const flatNodes = flattenTraceNodes(segment.traceDiagram?.traceNodes ?? [])
  return nodes.map((node, index) => {
    const [root] = node.codeBlocks
    const path = root.astGraph.filePath
    return {
      kind: "trace-node",
      id: node.id,
      segmentId: segment.id,
      describe: (sources, maxLineCount) => ({
        file: path,
        node: { ...flatNodes[index], name: nameOfBlock(root), blockLabels: describeBlockLabels(node, sources) },
        lineage: traceLineageOf(flatNodes[index], flatNodes),
        code: coverRange(sources, path, lineRangeOf(node), maxLineCount),
      }),
    }
  })
}

const traceStubOf = ({ id, parentId, type, label }: FlatTraceNode): unknown => ({ id, parentId, type, label })

const descriptionCandidates = (segment: Segment): Candidate[] => {
  const { traceDiagram } = segment
  return traceDiagram === null || !hasDrawnTrace(segment)
    ? []
    : [{
        kind: "trace-diagram",
        id: null,
        segmentId: segment.id,
        describe: () => ({
          file: null,
          node: {
            title: traceDiagram.title,
            description: traceDiagram.description,
            nodes: flattenTraceNodes(traceDiagram.traceNodes).map(traceStubOf),
            edges: traceDiagram.traceNodeEdges.map(({ from, to }) => ({ from, to })),
          },
          lineage: [],
          code: null,
        }),
      }]
}

const blastCandidate = (segment: Segment, node: BlastNode): Candidate => ({
  kind: "blast-node",
  id: node.path,
  segmentId: segment.id,
  describe: () => ({
    file: node.path,
    node: { ...node, importsCarryingTheChange: segment.blastDiagram === null ? [] : listCarriedImports(segment.blastDiagram, node.path) },
    lineage: [],
    code: null,
  }),
})

const contextCandidate = (segment: Segment): Candidate => ({
  kind: "context",
  id: null,
  segmentId: segment.id,
  describe: () => ({ file: null, node: { title: segment.title, context: segment.context }, lineage: [], code: null }),
})

const candidatesIn = (segment: Segment): Candidate[] => [
  ...(segment.blastDiagram?.nodes ?? []).filter((node) => node.diffType === null).map((node) => blastCandidate(segment, node)),
  contextCandidate(segment),
  ...waypointsOf(segment).map(waypointCandidate),
  ...traceCandidates(segment),
  ...descriptionCandidates(segment),
]

const MAX_LISTED_USER_COUNT = 12

const usersOf = (block: CodeBlock | null): string[] => (block === null ? [] : [...new Set(block.usedBy.map(placeOfBlock))])

const contextCodeBlockCandidate = (listed: ContextCodeBlock): Candidate => ({
  kind: "context-code-block",
  id: contextIdOf(listed),
  segmentId: null,
  describe: (sources, maxLineCount) => ({
    file: listed.codeBlock === null ? null : pathOfBlock(listed.codeBlock),
    node: {
      kind: listed.kind,
      name: nameOfContext(listed),
      library: listed.specifier,
      type: listed.codeBlock?.type ?? null,
      isRequired: listed.isRequired,
      description: listed.description,
      usedBy: listed.kind === "codebase" ? usersOf(listed.codeBlock).slice(0, MAX_LISTED_USER_COUNT) : [],
      usedByCount: listed.kind === "codebase" ? usersOf(listed.codeBlock).length : 0,
    },
    lineage: [],
    code: listed.codeBlock === null ? null : coverRange(sources, pathOfBlock(listed.codeBlock), lineRangeOfBlock(listed.codeBlock), maxLineCount),
  }),
})

const candidatesOf = (artifact: ReviewArtifact, segments: readonly Segment[]): Candidate[] => [
  ...segments.flatMap(candidatesIn),
  ...artifact.contextCodeBlocks.map(contextCodeBlockCandidate),
]

const needsOf = (candidate: Candidate, work: readonly Work[]): WorkKind[] =>
  work
    .filter((one) => one.target === candidate.kind && one.id === candidate.id && one.segmentId === candidate.segmentId)
    .map((one) => one.needs)

const toItem = (candidate: Candidate, needs: readonly WorkKind[], artifact: ReviewArtifact, maxLineCount: number): NodeItem => ({
  kind: candidate.kind,
  id: candidate.id,
  segmentId: candidate.segmentId,
  needs,
  ...candidate.describe(artifact.sources, maxLineCount),
})

const unknownItem = (id: string): NodeItem => ({
  kind: "unknown",
  id,
  segmentId: null,
  needs: [],
  file: null,
  node: null,
  lineage: [],
  code: null,
})

export interface NodeSelection {
  readonly artifact: ReviewArtifact
  readonly segments: readonly Segment[]
  readonly work: readonly Work[]
  readonly maxLineCount: number
}

export const itemsWithIds = ({ artifact, segments, work, maxLineCount }: NodeSelection, ids: readonly string[]): NodeItem[] => {
  const candidates = candidatesOf(artifact, segments)
  return ids.flatMap((id) => {
    const matches = candidates.filter((candidate) => candidate.id === id)
    return matches.length === 0
      ? [unknownItem(id)]
      : matches.map((candidate) => toItem(candidate, needsOf(candidate, work), artifact, maxLineCount))
  })
}

export const unwrittenItems = (
  { artifact, segments, work, maxLineCount }: NodeSelection,
  wantedKinds: readonly WorkKind[],
): NodeItem[] =>
  candidatesOf(artifact, segments)
    .map((candidate) => ({ candidate, needs: needsOf(candidate, work).filter((kind) => wantedKinds.includes(kind)) }))
    .filter(({ needs }) => needs.length > 0)
    .map(({ candidate, needs }) => toItem(candidate, needs, artifact, maxLineCount))
