import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { MARK_PREFIXES, rangeOfDeclaration } from "@/procedures/read-artifact/utils/covered-code"
import { codeLinkIdsIn, contextIdOf, listTraceNodes, rowSpanOf } from "@flightplan/codegraph"
import type {
  Blast,
  BlockLabel,
  CodeBlock,
  ContextCodeBlock,
  FileSection,
  TraceDiagram,
  TraceNode,
  LineRange,
  ReviewArtifact,
  Segment,
  SourceFile,
  SourceLine,
  Waypoint,
} from "@flightplan/configurations"

type SourcesByPath = ReadonlyMap<string, SourceFile>

interface CodeComparison {
  readonly previous: SourcesByPath
  readonly rebuilt: SourcesByPath
}

interface WrittenWaypoint {
  readonly waypoint: Waypoint
  readonly code: string | null
}

export type FileOrder = "written" | "rebuilt"

interface Carry {
  readonly comparison: CodeComparison
  readonly fileOrder: FileOrder
  readonly segments: ReadonlyMap<string, Segment>
  readonly files: ReadonlyMap<string, FileSection>
  readonly waypoints: ReadonlyMap<string, WrittenWaypoint>
  readonly traceNodes: ReadonlyMap<string, TraceNode>
  readonly contextDescriptions: ReadonlyMap<string, string>
}

const LINE_BREAK = "\n"
const KEY_SEPARATOR = "\n"
const TARGET_SEPARATOR = "#"
const UNNAMED = ""
const UNWRITTEN = ""

const sourcesByPath = (artifact: ReviewArtifact): SourcesByPath =>
  new Map(artifact.sources.map((source) => [source.path, source]))

const codeOfRows = (rows: readonly SourceLine[]): string =>
  rows.map((row) => `${MARK_PREFIXES[row.mark]}${row.text}`).join(LINE_BREAK)

const fileCodeOf = (sources: SourcesByPath, path: string): string | null => {
  const source = sources.get(path)
  return source === undefined ? null : codeOfRows(source.lines)
}

const rangeCodeOf = (sources: SourcesByPath, path: string, range: LineRange | null): string | null => {
  const source = sources.get(path)
  const span = source === undefined || range === null ? null : rowSpanOf(source, range)
  return source === undefined || span === null ? null : codeOfRows(source.lines.slice(span.start, span.end + 1))
}

const declarationCodeOf = (sources: SourcesByPath, path: string, declaration: string): string | null => {
  const source = sources.get(path)
  return rangeCodeOf(sources, path, source === undefined ? null : rangeOfDeclaration(source, declaration))
}

const isFileUnchanged = (comparison: CodeComparison, path: string): boolean => {
  const previousCode = fileCodeOf(comparison.previous, path)
  return previousCode !== null && previousCode === fileCodeOf(comparison.rebuilt, path)
}

const isLinkKept = (comparison: CodeComparison, linkId: string): boolean => {
  const separatorIndex = linkId.lastIndexOf(TARGET_SEPARATOR)
  const path = linkId.slice(0, Math.max(separatorIndex, 0))
  const source = comparison.rebuilt.get(path)
  if (separatorIndex < 0 || source === undefined) return false
  return rangeOfDeclaration(source, linkId.slice(separatorIndex + 1)) !== null || isFileUnchanged(comparison, path)
}

const areLinksKept = (comparison: CodeComparison, texts: readonly string[]): boolean =>
  codeLinkIdsIn(texts).every((linkId) => isLinkKept(comparison, linkId))

const inWrittenOrder = <Entry>(entries: readonly Entry[], writtenKeys: readonly string[], keyOf: (entry: Entry) => string): Entry[] => {
  const positionOf = (entry: Entry): number => {
    const position = writtenKeys.indexOf(keyOf(entry))
    return position < 0 ? writtenKeys.length : position
  }
  return [...entries].sort((one, two) => positionOf(one) - positionOf(two))
}

const waypointKeyOf = (path: string, declaration: string): string => [path, declaration].join(KEY_SEPARATOR)

const textsOfWaypoint = (waypoint: Waypoint): string[] => [
  waypoint.reading,
  waypoint.needsAttention ?? UNWRITTEN,
  ...waypoint.findings.flatMap((finding) => [finding.title, finding.reading, ...(finding.trace ?? [])]),
]

const carryWaypoint = (waypoint: Waypoint, path: string, carry: Carry): Waypoint => {
  const walked = { ...waypoint, children: waypoint.children.map((child) => carryWaypoint(child, path, carry)) }
  const written = carry.waypoints.get(waypointKeyOf(path, waypoint.declaration))
  const code = declarationCodeOf(carry.comparison.rebuilt, path, waypoint.declaration)
  if (written === undefined || code === null || written.code !== code) return walked
  if (!areLinksKept(carry.comparison, textsOfWaypoint(written.waypoint))) return walked
  return {
    ...walked,
    title: written.waypoint.title ?? waypoint.title,
    reading: written.waypoint.reading,
    needsAttention: written.waypoint.needsAttention,
    findings: written.waypoint.findings,
  }
}

const carryFile = (file: FileSection, carry: Carry): FileSection => {
  const walked = { ...file, waypoints: file.waypoints.map((waypoint) => carryWaypoint(waypoint, file.path, carry)) }
  const written = carry.files.get(file.path)
  if (written === undefined || !isFileUnchanged(carry.comparison, file.path)) return walked
  return {
    ...walked,
    waypoints: inWrittenOrder(walked.waypoints, written.waypoints.map((waypoint) => waypoint.declaration), (waypoint) => waypoint.declaration),
  }
}

const blockKeyOf = (block: CodeBlock, sources: SourcesByPath): string | null => {
  const path = block.astGraph.filePath
  const [{ start, end }] = block.lineOfCodeRangeReference
  const code = rangeCodeOf(sources, path, { lineStart: start.line, lineEnd: end.line })
  return code === null ? null : [path, block.type, block.name ?? UNNAMED, code].join(KEY_SEPARATOR)
}

const carryBlockLabel = (listed: BlockLabel, writtenLabels: readonly BlockLabel[], comparison: CodeComparison): BlockLabel => {
  const key = blockKeyOf(listed.codeBlock, comparison.rebuilt)
  const written = key === null
    ? undefined
    : writtenLabels.find((candidate) => blockKeyOf(candidate.codeBlock, comparison.previous) === key)
  return written === undefined ? listed : { ...listed, label: written.label ?? listed.label }
}

const carryTraceNode = (node: TraceNode, carry: Carry): TraceNode => {
  const walked = { ...node, children: node.children.map((child) => carryTraceNode(child, carry)) }
  const key = blockKeyOf(node.codeBlocks[0], carry.comparison.rebuilt)
  const written = key === null ? undefined : carry.traceNodes.get(key)
  if (written === undefined || !areLinksKept(carry.comparison, [written.description ?? UNWRITTEN])) return walked
  return {
    ...walked,
    label: written.label ?? node.label,
    description: written.description ?? node.description,
    triggerLabels: node.triggerLabels.map((trigger) => carryBlockLabel(trigger, written.triggerLabels, carry.comparison)),
    blockLabels: node.blockLabels.map((listed) => carryBlockLabel(listed, written.blockLabels, carry.comparison)),
  }
}

const carryBlast = (blastDiagram: Blast | null, written: Blast | null): Blast | null =>
  blastDiagram === null || written === null
    ? blastDiagram
    : {
        ...blastDiagram,
        nodes: blastDiagram.nodes.map((node) => {
          const writtenNode = written.nodes.find((candidate) => candidate.path === node.path)
          return writtenNode === undefined || node.diffType !== null
            ? node
            : { ...node, impactType: writtenNode.impactType, impactReason: writtenNode.impactReason }
        }),
      }

const segmentKeyOf = (segment: Segment): string => segment.changedPaths.join(KEY_SEPARATOR)

const textsOfSegment = (segment: Segment): string[] => [
  segment.context,
  segment.traceDiagram?.description ?? UNWRITTEN,
  ...(segment.blastDiagram?.nodes ?? []).map((node) => node.impactReason ?? UNWRITTEN),
]

const WRITTEN_ORDER: FileOrder = "written"

const edgeKeysOf = (traceDiagram: TraceDiagram): string[] => traceDiagram.traceNodeEdges.map((edge) => edge.id).sort()

const isSameDrawing = (traceDiagram: TraceDiagram, written: TraceDiagram): boolean =>
  edgeKeysOf(traceDiagram).join(KEY_SEPARATOR) === edgeKeysOf(written).join(KEY_SEPARATOR)
  && listTraceNodes(traceDiagram.traceNodes).length === listTraceNodes(written.traceNodes).length

const carryDescription = (traceDiagram: TraceDiagram | null, written: TraceDiagram | null): TraceDiagram | null =>
  traceDiagram === null || written === null || !isSameDrawing(traceDiagram, written)
    ? traceDiagram
    : { ...traceDiagram, description: written.description }

const carrySegmentWriting = (segment: Segment, written: Segment, fileOrder: FileOrder): Segment => ({
  ...segment,
  title: written.title.trim() === UNWRITTEN ? segment.title : written.title,
  context: written.context,
  traceDiagram: carryDescription(segment.traceDiagram, written.traceDiagram),
  blastDiagram: carryBlast(segment.blastDiagram, written.blastDiagram),
  walkthrough: {
    files: fileOrder === WRITTEN_ORDER
      ? inWrittenOrder(segment.walkthrough.files, written.walkthrough.files.map((file) => file.path), (file) => file.path)
      : segment.walkthrough.files,
  },
})

const carrySegment = (segment: Segment, carry: Carry): Segment => {
  const walked: Segment = {
    ...segment,
    traceDiagram: segment.traceDiagram === null
      ? null
      : { ...segment.traceDiagram, traceNodes: segment.traceDiagram.traceNodes.map((node) => carryTraceNode(node, carry)) },
    walkthrough: { ...segment.walkthrough, files: segment.walkthrough.files.map((file) => carryFile(file, carry)) },
  }
  const written = carry.segments.get(segmentKeyOf(segment))
  const isUnchanged = segment.changedPaths.every((path) => isFileUnchanged(carry.comparison, path))
  return written !== undefined && isUnchanged && areLinksKept(carry.comparison, textsOfSegment(written))
    ? carrySegmentWriting(walked, written, carry.fileOrder)
    : walked
}

const writtenTraceNodesIn = (artifact: ReviewArtifact, sources: SourcesByPath): ReadonlyMap<string, TraceNode> =>
  new Map(
    artifact.segments
      .flatMap((segment) => listTraceNodes(segment.traceDiagram?.traceNodes ?? []))
      .flatMap((node) => {
        const key = blockKeyOf(node.codeBlocks[0], sources)
        return key === null ? [] : [[key, node] as const]
      }),
  )

const writtenWaypointsIn = (artifact: ReviewArtifact, sources: SourcesByPath): ReadonlyMap<string, WrittenWaypoint> =>
  new Map(
    artifact.segments.flatMap(waypointsOf).map(({ file, waypoint }) => [
      waypointKeyOf(file.path, waypoint.declaration),
      { waypoint, code: declarationCodeOf(sources, file.path, waypoint.declaration) },
    ]),
  )

const contextKeyOf = (listed: ContextCodeBlock, sources: SourcesByPath): string | null =>
  listed.kind === "codebase" && listed.codeBlock !== null ? blockKeyOf(listed.codeBlock, sources) : contextIdOf(listed)

const writtenContextDescriptionsIn = (artifact: ReviewArtifact, sources: SourcesByPath): ReadonlyMap<string, string> =>
  new Map(
    artifact.contextCodeBlocks.flatMap((listed) => {
      const key = contextKeyOf(listed, sources)
      return key === null || listed.description === null ? [] : [[key, listed.description] as const]
    }),
  )

const carryContextCodeBlock = (listed: ContextCodeBlock, carry: Carry): ContextCodeBlock => {
  const key = contextKeyOf(listed, carry.comparison.rebuilt)
  const written = key === null ? undefined : carry.contextDescriptions.get(key)
  return written === undefined || !areLinksKept(carry.comparison, [written]) ? listed : { ...listed, description: written }
}

export const carryWriting = (previous: ReviewArtifact, rebuilt: ReviewArtifact, fileOrder: FileOrder): ReviewArtifact => {
  const comparison = { previous: sourcesByPath(previous), rebuilt: sourcesByPath(rebuilt) }
  const carry: Carry = {
    comparison,
    fileOrder,
    segments: new Map(previous.segments.map((segment) => [segmentKeyOf(segment), segment])),
    files: new Map(previous.segments.flatMap((segment) => segment.walkthrough.files).map((file) => [file.path, file])),
    waypoints: writtenWaypointsIn(previous, comparison.previous),
    traceNodes: writtenTraceNodesIn(previous, comparison.previous),
    contextDescriptions: writtenContextDescriptionsIn(previous, comparison.previous),
  }
  return {
    ...rebuilt,
    segments: rebuilt.segments.map((segment) => carrySegment(segment, carry)),
    contextCodeBlocks: rebuilt.contextCodeBlocks.map((listed) => carryContextCodeBlock(listed, carry)),
  }
}
