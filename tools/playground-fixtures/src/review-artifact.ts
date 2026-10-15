import { z } from "zod"
import {
  assembleReviewArtifact,
  linkCodeGroupGraph,
  linkJourneyFlowDiagram,
  parseHunks,
  type RangedWaypoint,
  type SegmentParts,
  type StoredCodeGroupGraph,
  type StoredJourneyNode,
} from "@flightplan/codegraph"
import {
  blastSchema,
  CODE_BLOCK_TYPES,
  codeExportSchema,
  codeReferenceSchema,
  languageReferenceSchema,
  DIFF_TYPES,
  reviewArtifactSchema,
  type ASTCodeGroupGraph,
  type CodeBlock,
  type ImportGraphGroup,
  type JourneyFlowDiagram,
  type ReviewArtifact,
} from "@flightplan/configurations"
import type { RepositoryFiles } from "./apply-diffs"

const LINE_BREAK = "\n"
const MOCK_HEAD_COMMIT = "2222222222222222222222222222222222222222"
const MOCK_SEGMENT_ID_PREFIX = "fixture-segment-"

interface StoredWaypoint extends Omit<RangedWaypoint, "codeBlocks" | "children"> {
  readonly codeBlockIds: readonly string[]
  readonly children: readonly StoredWaypoint[]
}

const lineRangeSchema = z.object({ lineStart: z.number().int(), lineEnd: z.number().int() })

const storedWaypointSchema: z.ZodType<StoredWaypoint> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    declaration: z.string(),
    codeBlockIds: z.array(z.string()),
    reading: z.string(),
    needsAttention: z.string().nullable(),
    findings: z.array(z.never()),
    children: z.array(storedWaypointSchema),
    range: lineRangeSchema,
  }),
)

const storedFileSectionSchema = z.object({
  path: z.string(),
  waypoints: z.array(storedWaypointSchema),
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
    blockLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })),
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
  context: z.array(z.string()),
  importGraph: z.array(importGraphFileSchema),
  journeyFlowDiagram: storedJourneySchema.nullable(),
  blastRadiusDiagram: blastSchema.nullable(),
  codeWalkthrough: z.object({ files: z.array(storedFileSectionSchema) }),
  codeReferences: z.array(z.object({ path: z.string(), references: z.array(codeReferenceSchema), languageReferences: z.array(languageReferenceSchema).default([]), exports: z.array(codeExportSchema).default([]) })),
})

export const caseSnapshotSchema = z.object({
  title: z.string(),
  diff: z.array(z.string()),
  codegraph: z.object({ segments: z.array(codegraphSegmentSchema) }),
})

export type CaseSnapshot = z.infer<typeof caseSnapshotSchema>

type CodegraphSegment = z.infer<typeof codegraphSegmentSchema>

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

type BlockById = ReadonlyMap<string, CodeBlock>

const foundBlock = (blockById: BlockById, blockId: string): CodeBlock => {
  const block = blockById.get(blockId)
  if (block === undefined) throw new Error(`A waypoint of the snapshot names the block ${blockId}, which no group of its code blocks holds.`)
  return block
}

const linkWaypoint = ({ codeBlockIds, children, ...written }: StoredWaypoint, blockById: BlockById): RangedWaypoint => ({
  ...written,
  codeBlocks: codeBlockIds.map((blockId) => foundBlock(blockById, blockId)),
  children: children.map((child) => linkWaypoint(child, blockById)),
})

const walkthroughOf = ({ codeWalkthrough }: CodegraphSegment, blockById: BlockById): SegmentParts["walkthrough"] => ({
  files: codeWalkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => linkWaypoint(waypoint, blockById)) })),
})

interface LinkedSegment {
  readonly journey: JourneyFlowDiagram | null
  readonly walkthrough: SegmentParts["walkthrough"]
}

const toSegmentParts = (segment: CodegraphSegment, { journey, walkthrough }: LinkedSegment, position: number): SegmentParts => ({
  id: `${MOCK_SEGMENT_ID_PREFIX}${String(position + 1)}`,
  title: segment.title,
  context: segment.context.join(LINE_BREAK),
  importGraph: segment.importGraph,
  journey,
  blast: segment.blastRadiusDiagram,
  walkthrough,
  codeReferences: segment.codeReferences,
})

const isWritten = (segments: readonly CodegraphSegment[]): boolean => segments.every((segment) => segment.title !== null)

export const toReviewArtifact = (snapshot: CaseSnapshot, headFiles: RepositoryFiles, storedGroups: readonly StoredCodeGroupGraph[]): ReviewArtifact => {
  const { segments } = snapshot.codegraph
  const groups = storedGroups.map(linkCodeGroupGraph)
  const blockById: BlockById = new Map([...groups.flatMap((group) => group.codeBlocks)].reverse().map((block) => [block.id, block] as const))
  const linked = segments.map((segment) => ({ journey: journeyOf(segment, groups), walkthrough: walkthroughOf(segment, blockById) }))
  return reviewArtifactSchema.parse(
    assembleReviewArtifact({
      title: snapshot.title,
      status: isWritten(segments) ? "complete" : "drafting",
      commit: MOCK_HEAD_COMMIT,
      hunks: parseHunks(snapshot.diff.join(LINE_BREAK)),
      textOf: (path) => headFiles.get(path) ?? null,
      segments: segments.map((segment, position) => toSegmentParts(segment, linked[position], position)),
    }),
  )
}
