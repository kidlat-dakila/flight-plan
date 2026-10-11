import { z } from "zod"
import {
  buildSourceLines,
  languageOf,
  linkCodeGroupGraph,
  linkJourneyFlowDiagram,
  listJourneyNodes,
  parseHunks,
  type HunksByPath,
  type StoredCodeGroupGraph,
  type StoredJourneyNode,
} from "@flightplan/codegraph"
import {
  blastSchema,
  CODE_BLOCK_TYPES,
  codeReferenceSchema,
  DIFF_TYPES,
  reviewArtifactSchema,
  type ASTCodeGroupGraph,
  type CodeReference,
  type ImportGraphGroup,
  type JourneyFlowDiagram,
  type LineRange,
  type ReviewArtifact,
  type Segment,
  type SourceFile,
  type Waypoint,
} from "@flightplan/configurations"
import type { RepositoryFiles } from "./apply-diffs"

const LINE_BREAK = "\n"
const MOCK_HEAD_COMMIT = "2222222222222222222222222222222222222222"
const MOCK_SEGMENT_ID_PREFIX = "fixture-segment-"
const UNTITLED_SEGMENT = ""

interface LinkedWaypoint extends Waypoint {
  readonly range: LineRange
  readonly children: readonly LinkedWaypoint[]
}

const lineRangeSchema = z.object({ lineStart: z.number().int(), lineEnd: z.number().int() })

const linkedWaypointSchema: z.ZodType<LinkedWaypoint> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    declaration: z.string(),
    reading: z.string(),
    needsAttention: z.string().nullable(),
    findings: z.array(z.never()),
    children: z.array(linkedWaypointSchema),
    range: lineRangeSchema,
  }),
)

const linkedFileSectionSchema = z.object({
  path: z.string(),
  title: z.string(),
  summary: z.array(z.string()),
  waypoints: z.array(linkedWaypointSchema),
})

const storedJourneyNodeSchema: z.ZodType<StoredJourneyNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(CODE_BLOCK_TYPES),
    label: z.string().nullable(),
    description: z.string().nullable(),
    codeBlockIds: z.array(z.string()),
    diffCodeBlockIds: z.array(z.string()),
    children: z.array(storedJourneyNodeSchema),
    triggerLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })),
  }),
)

const storedJourneySchema = z.object({
  journeyNodes: z.array(storedJourneyNodeSchema),
  journeyNodeEdges: z.array(z.object({ id: z.string(), from: z.string(), to: z.string() })),
})

const importGraphFileSchema = z.object({
  filePath: z.string(),
  gitSha: z.string(),
  diffType: z.enum(DIFF_TYPES).nullable(),
  importedBy: z.array(z.string()),
  importsTo: z.array(z.string()),
  importedFilePaths: z.record(z.string(), z.string()),
})

const codegraphSegmentSchema = z.object({
  title: z.string().nullable(),
  importGraph: z.array(importGraphFileSchema),
  journeyFlowDiagram: storedJourneySchema.nullable(),
  blastRadiusDiagram: blastSchema.nullable(),
  codeWalkthrough: z.object({ intro: z.string().nullable(), files: z.array(linkedFileSectionSchema) }),
  codeReferences: z.array(z.object({ path: z.string(), references: z.array(codeReferenceSchema) })),
})

export const caseSnapshotSchema = z.object({
  title: z.string(),
  context: z.array(z.string()),
  diff: z.array(z.string()),
  codegraph: z.object({ segments: z.array(codegraphSegmentSchema) }),
})

export type CaseSnapshot = z.infer<typeof caseSnapshotSchema>

type CodegraphSegment = z.infer<typeof codegraphSegmentSchema>

type LinkedFileSection = z.infer<typeof linkedFileSectionSchema>

const inOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => one.localeCompare(two))

const toWaypoint = (waypoint: LinkedWaypoint): Waypoint => ({
  id: waypoint.id,
  title: waypoint.title,
  declaration: waypoint.declaration,
  reading: waypoint.reading,
  needsAttention: waypoint.needsAttention,
  findings: waypoint.findings,
  children: waypoint.children.map(toWaypoint),
})

const listWaypoints = (waypoints: readonly LinkedWaypoint[]): LinkedWaypoint[] =>
  waypoints.flatMap((waypoint) => [waypoint, ...listWaypoints(waypoint.children)])

const changedPathsOf = (segment: CodegraphSegment): string[] =>
  inOrder(segment.importGraph.filter((file) => file.diffType !== null).map((file) => file.filePath))

const importGraphGroupOf = (segment: CodegraphSegment, group: ASTCodeGroupGraph): ImportGraphGroup => {
  const groupPaths = new Set(group.astGraphs.map((astGraph) => astGraph.filePath))
  return segment.importGraph
    .filter((file) => groupPaths.has(file.filePath))
    .map((file) => ({ ...file, importedFilePaths: new Map(Object.entries(file.importedFilePaths)) }))
}

const journeyOf = (segment: CodegraphSegment, groups: readonly ASTCodeGroupGraph[]): JourneyFlowDiagram | null => {
  const stored = segment.journeyFlowDiagram
  if (stored === null) return null
  const firstBlockId = stored.journeyNodes.at(0)?.codeBlockIds.at(0)
  const group = groups.find((candidate) => candidate.codeBlocks.some((block) => block.id === firstBlockId))
  if (group === undefined) throw new Error("A journey of the snapshot names a block no group of its code blocks holds.")
  return linkJourneyFlowDiagram(stored, group, importGraphGroupOf(segment, group))
}

const toSegment = (segment: CodegraphSegment, journey: JourneyFlowDiagram | null, position: number, context: string): Segment => ({
  id: `${MOCK_SEGMENT_ID_PREFIX}${String(position + 1)}`,
  title: segment.title ?? UNTITLED_SEGMENT,
  changedPaths: changedPathsOf(segment),
  context,
  journey,
  blast: segment.blastRadiusDiagram,
  walkthrough: {
    intro: segment.codeWalkthrough.intro,
    files: segment.codeWalkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(toWaypoint) })),
  },
})

const declarationsOf = (path: string, sections: readonly LinkedFileSection[]): Record<string, LineRange> =>
  Object.fromEntries(
    sections
      .filter((section) => section.path === path)
      .flatMap((section) => listWaypoints(section.waypoints))
      .map((waypoint) => [waypoint.declaration, waypoint.range]),
  )

const NO_CHANGE: HunksByPath[string] = { added: [], removed: [], isCreated: false }

const referencesOf = (path: string, segments: readonly CodegraphSegment[]): CodeReference[] =>
  segments.flatMap((segment) => segment.codeReferences.filter((file) => file.path === path).flatMap((file) => file.references))

const listViewedPaths = (segments: readonly CodegraphSegment[], journeys: readonly (JourneyFlowDiagram | null)[]): string[] => [
  ...journeys.flatMap((journey) => listJourneyNodes(journey?.journeyNodes ?? []).map((node) => node.codeBlocks[0].astGraph.filePath)),
  ...segments.flatMap((segment) => segment.codeReferences.flatMap((file) => file.references.map((reference) => reference.path))),
]

const toSourceFile = (
  path: string,
  hunks: HunksByPath,
  headFiles: RepositoryFiles,
  segments: readonly CodegraphSegment[],
): SourceFile[] => {
  const hunk = new Map(Object.entries(hunks)).get(path)
  const text = headFiles.get(path) ?? null
  if (hunk === undefined && text === null) return []
  return [
    {
      path,
      language: languageOf(path),
      lines: buildSourceLines(text, hunk ?? NO_CHANGE),
      declarations: declarationsOf(path, segments.flatMap((segment) => segment.codeWalkthrough.files)),
      references: referencesOf(path, segments),
    },
  ]
}

const isWritten = (segments: readonly CodegraphSegment[]): boolean => segments.every((segment) => segment.title !== null)

export const toReviewArtifact = (snapshot: CaseSnapshot, headFiles: RepositoryFiles, storedGroups: readonly StoredCodeGroupGraph[]): ReviewArtifact => {
  const { segments } = snapshot.codegraph
  const groups = storedGroups.map(linkCodeGroupGraph)
  const journeys = segments.map((segment) => journeyOf(segment, groups))
  const hunks = parseHunks(snapshot.diff.join(LINE_BREAK))
  const changedPaths = inOrder(Object.keys(hunks))
  const sourcePaths = [...new Set([...changedPaths, ...inOrder(listViewedPaths(segments, journeys))])]
  const context = snapshot.context.join(LINE_BREAK)
  return reviewArtifactSchema.parse({
    title: snapshot.title,
    status: isWritten(segments) ? "complete" : "drafting",
    commit: MOCK_HEAD_COMMIT,
    isSegmented: segments.length > 1,
    segments: segments.map((segment, position) => toSegment(segment, journeys[position], position, context)),
    sources: sourcePaths.flatMap((path) => toSourceFile(path, hunks, headFiles, segments)),
    changedPaths,
  })
}
