import { z } from "zod"
import { caseSnapshotSchema, type CaseSnapshot } from "@flightplan/playground-fixtures"

export interface TracedWaypoint {
  readonly id: string
  readonly declaration: string
  readonly range: { readonly lineStart: number, readonly lineEnd: number }
  readonly codeBlockIds: readonly string[]
  readonly children: readonly TracedWaypoint[]
}

const tracedWaypointSchema: z.ZodType<TracedWaypoint> = z.lazy(() =>
  z.object({
    id: z.string(),
    declaration: z.string(),
    range: z.object({ lineStart: z.number().int(), lineEnd: z.number().int() }),
    codeBlockIds: z.array(z.string()),
    children: z.array(tracedWaypointSchema),
  }),
)

export interface TracedFileSection {
  readonly path: string
  readonly waypoints: readonly TracedWaypoint[]
}

export interface TraceSegment {
  readonly title: string | null
  readonly importGraph: readonly unknown[]
  readonly traceDiagram: unknown
  readonly codeWalkthrough: { readonly files: readonly TracedFileSection[] }
  readonly codeReferences: readonly unknown[]
}

export interface TraceSnapshot {
  readonly title: string
  readonly diff: readonly string[]
  readonly codegraph: { readonly segments: readonly TraceSegment[] }
}

const traceSegmentSchema = z.object({
  title: z.string().nullable(),
  importGraph: z.array(z.unknown()),
  traceDiagram: z.unknown(),
  codeWalkthrough: z.object({
    files: z.array(z.object({ path: z.string(), waypoints: z.array(tracedWaypointSchema) })),
  }),
  codeReferences: z.array(z.unknown()),
})

export const traceSnapshotSchema: z.ZodType<TraceSnapshot> = z.object({
  title: z.string(),
  diff: z.array(z.string()),
  codegraph: z.object({ segments: z.array(traceSegmentSchema) }),
})

const NO_CONTEXT: readonly string[] = []

const toUnwrittenWaypoint = ({ children, ...waypoint }: TracedWaypoint): unknown => ({
  ...waypoint,
  title: null,
  reading: "",
  coreChange: null,
  findings: [],
  children: children.map(toUnwrittenWaypoint),
})

const toReviewSegment = ({ codeWalkthrough, ...segment }: TraceSegment): unknown => ({
  ...segment,
  context: NO_CONTEXT,
  blastDiagram: null,
  hiddenBlastDiagram: null,
  codeWalkthrough: {
    files: codeWalkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(toUnwrittenWaypoint) })),
  },
})

export const toReviewSnapshot = (snapshot: TraceSnapshot): unknown => ({
  ...snapshot,
  codegraph: { segments: snapshot.codegraph.segments.map(toReviewSegment) },
})

export const toCaseSnapshot = (snapshot: TraceSnapshot): CaseSnapshot => caseSnapshotSchema.parse(toReviewSnapshot(snapshot))
