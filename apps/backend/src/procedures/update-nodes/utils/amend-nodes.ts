import { notGeneratedMessage, sectionsOf, switchedOffSections } from "@/procedures/read-artifact/utils/artifact-sections"
import { segmentsIn, unknownSegmentMessage } from "@/procedures/read-artifact/utils/artifact-walk"
import type { ReviewArtifact, SectionName, Segment } from "@flightplan/configurations"
import { amendBlast, blastTextsOf } from "./amend-blast"
import { amendContextCodeBlocks, contextCodeBlockTextsOf } from "./amend-context-code-blocks"
import { amendSegments, countSegmentEdits, segmentTextsOf } from "./amend-segment"
import { amendTrace, traceTextsOf } from "./amend-trace"
import { amendWaypoints, repeatedFindingIdsIn, waypointTextsOf } from "./amend-waypoints"
import { refuse, withSegments, type ArtifactAmended, type Refusal, type SegmentsOutcome } from "./refusal"
import type { BlastEdit, ContextCodeBlockEdit, TraceEdit, SegmentEdit, WaypointEdit } from "./schemas"
import { linkProblemOf } from "./written-links"

export interface NodeEdits {
  readonly segmentId: string
  readonly segment: SegmentEdit
  readonly waypoints: readonly WaypointEdit[]
  readonly traceDiagram: readonly TraceEdit[]
  readonly blastDiagram: readonly BlastEdit[]
  readonly contextCodeBlocks: readonly ContextCodeBlockEdit[]
}

type AmendStep = (segments: readonly Segment[]) => SegmentsOutcome

const NOTHING_GIVEN_MESSAGE = "Give at least one of title, context, order, traceDiagramDescription, waypoints, trace, blast or contextCodeBlocks."

const stepFor = <Edit>(edits: readonly Edit[], amend: (segments: readonly Segment[], edits: readonly Edit[]) => SegmentsOutcome): AmendStep[] =>
  edits.length === 0 ? [] : [(segments) => amend(segments, edits)]

const runSteps = (segments: readonly Segment[], steps: readonly AmendStep[]): SegmentsOutcome =>
  steps.reduce<SegmentsOutcome>(
    (outcome, step) => (outcome.kind === "refused" ? outcome : step(outcome.segments)),
    { kind: "amended", segments },
  )

const textsOf = (edits: NodeEdits): string[] => [
  ...segmentTextsOf(edits.segment),
  ...waypointTextsOf(edits.waypoints),
  ...traceTextsOf(edits.traceDiagram),
  ...blastTextsOf(edits.blastDiagram),
  ...contextCodeBlockTextsOf(edits.contextCodeBlocks),
]

export const countEdits = (edits: NodeEdits): number =>
  countSegmentEdits(edits.segment)
  + edits.waypoints.length
  + edits.traceDiagram.length
  + edits.blastDiagram.length
  + edits.contextCodeBlocks.length

const isWritten = (edit: unknown): boolean => edit !== undefined

const WRITES_BY_SECTION: Readonly<Record<SectionName, (edits: NodeEdits) => boolean>> = {
  traceDiagram: (edits) => edits.traceDiagram.length > 0 || isWritten(edits.segment.traceDiagramDescription),
  blastDiagram: (edits) => edits.blastDiagram.length > 0,
  walkthrough: (edits) =>
    edits.waypoints.length > 0 || isWritten(edits.segment.order),
  findings: (edits) => edits.waypoints.some((waypoint) => isWritten(waypoint.findings)),
}

const offSectionWrittenBy = (edits: NodeEdits, artifact: ReviewArtifact): SectionName | null =>
  switchedOffSections(sectionsOf(artifact)).find((section) => WRITES_BY_SECTION[section](edits)) ?? null

export const amendNodes = (artifact: ReviewArtifact, edits: NodeEdits): ArtifactAmended | Refusal => {
  if (countEdits(edits) === 0) return refuse(NOTHING_GIVEN_MESSAGE)
  const offSection = offSectionWrittenBy(edits, artifact)
  if (offSection !== null) return refuse(notGeneratedMessage(offSection))
  const segments = segmentsIn(artifact, edits.segmentId)
  if (segments.length === 0) return refuse(unknownSegmentMessage(artifact, edits.segmentId))
  const linkProblem = linkProblemOf(textsOf(edits), artifact.sources)
  if (linkProblem !== null) return refuse(linkProblem)
  const outcome = runSteps(segments, [
    ...(countSegmentEdits(edits.segment) === 0 ? [] : [(given: readonly Segment[]) => amendSegments(given, edits.segment)]),
    ...stepFor(edits.waypoints, amendWaypoints),
    ...stepFor(edits.traceDiagram, amendTrace),
    ...stepFor(edits.blastDiagram, amendBlast),
  ])
  if (outcome.kind === "refused") return outcome
  const amended = withSegments(artifact, outcome.segments)
  const repeatedFindingIds = repeatedFindingIdsIn(amended.segments, edits.waypoints)
  return repeatedFindingIds.length > 0
    ? refuse(`A finding id is unique in the artifact, and ${repeatedFindingIds.map((id) => `\`${id}\``).join(", ")} would be used twice.`)
    : amendContextCodeBlocks(amended, edits.contextCodeBlocks)
}
