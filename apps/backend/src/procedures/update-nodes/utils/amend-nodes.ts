import type { ReviewArtifact, Segment } from "@/procedures/get-review/utils/review-artifact"
import { segmentsIn, unknownSegmentMessage } from "@/procedures/read-artifact/utils/artifact-walk"
import { amendBlast, blastTextsOf } from "./amend-blast"
import { amendFiles, fileTextsOf } from "./amend-files"
import { amendJourney, journeyTextsOf } from "./amend-journey"
import { amendWaypoints, repeatedFindingIdsIn, waypointTextsOf } from "./amend-waypoints"
import { refuse, withSegments, type ArtifactAmended, type Refusal, type SegmentsOutcome } from "./refusal"
import type { BlastEdit, FileEdit, JourneyEdit, WaypointEdit } from "./schemas"
import { linkProblemOf } from "./written-links"

export interface NodeEdits {
  readonly segmentId: string | null
  readonly waypoints: readonly WaypointEdit[]
  readonly files: readonly FileEdit[]
  readonly journey: readonly JourneyEdit[]
  readonly blast: readonly BlastEdit[]
}

type AmendStep = (segments: readonly Segment[]) => SegmentsOutcome

const NOTHING_GIVEN_MESSAGE = "Give waypoints, files, journey or blast."

const stepFor = <Edit>(edits: readonly Edit[], amend: (segments: readonly Segment[], edits: readonly Edit[]) => SegmentsOutcome): AmendStep[] =>
  edits.length === 0 ? [] : [(segments) => amend(segments, edits)]

const runSteps = (segments: readonly Segment[], steps: readonly AmendStep[]): SegmentsOutcome =>
  steps.reduce<SegmentsOutcome>(
    (outcome, step) => (outcome.kind === "refused" ? outcome : step(outcome.segments)),
    { kind: "amended", segments },
  )

const textsOf = (edits: NodeEdits): string[] => [
  ...waypointTextsOf(edits.waypoints),
  ...fileTextsOf(edits.files),
  ...journeyTextsOf(edits.journey),
  ...blastTextsOf(edits.blast),
]

export const countEdits = (edits: NodeEdits): number =>
  edits.waypoints.length + edits.files.length + edits.journey.length + edits.blast.length

export const amendNodes = (artifact: ReviewArtifact, edits: NodeEdits): ArtifactAmended | Refusal => {
  if (countEdits(edits) === 0) return refuse(NOTHING_GIVEN_MESSAGE)
  const segments = segmentsIn(artifact, edits.segmentId)
  if (edits.segmentId !== null && segments.length === 0) return refuse(unknownSegmentMessage(artifact, edits.segmentId))
  const linkProblem = linkProblemOf(textsOf(edits), artifact.sources)
  if (linkProblem !== null) return refuse(linkProblem)
  const outcome = runSteps(segments, [
    ...stepFor(edits.waypoints, amendWaypoints),
    ...stepFor(edits.files, amendFiles),
    ...stepFor(edits.journey, amendJourney),
    ...stepFor(edits.blast, amendBlast),
  ])
  if (outcome.kind === "refused") return outcome
  const amended = withSegments(artifact, outcome.segments)
  const repeatedFindingIds = repeatedFindingIdsIn(amended.segments, edits.waypoints)
  return repeatedFindingIds.length > 0
    ? refuse(`A finding id is unique in the artifact, and ${repeatedFindingIds.map((id) => `\`${id}\``).join(", ")} would be used twice.`)
    : { kind: "amended", artifact: amended }
}
