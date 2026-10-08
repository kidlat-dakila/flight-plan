import { z } from "zod"
import { buildSourceLines, languageOf, parseHunks, type HunksByPath } from "@flightplan/codegraph"
import {
  blastSchema,
  journeyFlowSchema,
  reviewArtifactSchema,
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

const codegraphSegmentSchema = z.object({
  title: z.string().nullable(),
  importGraph: z.array(z.object({ filePath: z.string(), diffType: z.string().nullable() })),
  journeyFlowDiagram: journeyFlowSchema.nullable(),
  blastRadiusDiagram: blastSchema,
  codeWalkthrough: z.object({ intro: z.string().nullable(), files: z.array(linkedFileSectionSchema) }),
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

const toSegment = (segment: CodegraphSegment, position: number, context: string): Segment => ({
  id: `${MOCK_SEGMENT_ID_PREFIX}${String(position + 1)}`,
  title: segment.title ?? UNTITLED_SEGMENT,
  changedPaths: changedPathsOf(segment),
  context,
  journey: segment.journeyFlowDiagram,
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

const toSourceFile = (
  path: string,
  hunks: HunksByPath,
  headFiles: RepositoryFiles,
  sections: readonly LinkedFileSection[],
): SourceFile[] => {
  const hunk = new Map(Object.entries(hunks)).get(path)
  if (hunk === undefined) return []
  return [
    {
      path,
      language: languageOf(path),
      lines: buildSourceLines(headFiles.get(path) ?? null, hunk),
      declarations: declarationsOf(path, sections),
    },
  ]
}

const isWritten = (segments: readonly CodegraphSegment[]): boolean => segments.every((segment) => segment.title !== null)

export const toReviewArtifact = (snapshot: CaseSnapshot, headFiles: RepositoryFiles): ReviewArtifact => {
  const { segments } = snapshot.codegraph
  const hunks = parseHunks(snapshot.diff.join(LINE_BREAK))
  const changedPaths = inOrder(Object.keys(hunks))
  const sections = segments.flatMap((segment) => segment.codeWalkthrough.files)
  const context = snapshot.context.join(LINE_BREAK)
  return reviewArtifactSchema.parse({
    title: snapshot.title,
    status: isWritten(segments) ? "complete" : "drafting",
    commit: MOCK_HEAD_COMMIT,
    isSegmented: segments.length > 1,
    segments: segments.map((segment, position) => toSegment(segment, position, context)),
    sources: changedPaths.flatMap((path) => toSourceFile(path, hunks, headFiles, sections)),
    changedPaths,
  })
}
