import { unknownSegmentMessage } from "@/procedures/read-artifact/utils/artifact-walk"
import { refuse, withSegments, type ArtifactAmended, type Refusal } from "@/procedures/update-nodes/utils/refusal"
import { linkProblemOf } from "@/procedures/update-nodes/utils/written-links"
import type { FileSection, ReviewArtifact, Segment } from "@flightplan/configurations"
import type { DocumentEdit } from "./schemas"

const NOTHING_GIVEN_MESSAGE = "Give at least one of context, intro, order, journeyAbsence or blastAbsence."

const quoted = (paths: readonly string[]): string => paths.map((path) => `\`${path}\``).join(", ")

const isEmptyEdit = (edit: DocumentEdit): boolean =>
  [edit.context, edit.intro, edit.order, edit.journeyAbsence, edit.blastAbsence].every((written) => written === undefined)

const segmentProblemOf = (artifact: ReviewArtifact, segmentId: string | undefined): string | null => {
  if (segmentId !== undefined) {
    return artifact.segments.some((segment) => segment.id === segmentId) ? null : unknownSegmentMessage(artifact, segmentId)
  }
  return artifact.segments.length === 1
    ? null
    : `This artifact has ${String(artifact.segments.length)} segments: ${artifact.segments.map((segment) => segment.id).join(", ")}. Name the one this call writes with segmentId.`
}

const orderProblemOf = (files: readonly FileSection[], orderedPaths: readonly string[]): string | null => {
  const knownPaths = files.map((file) => file.path)
  const unknownPaths = orderedPaths.filter((path) => !knownPaths.includes(path))
  if (unknownPaths.length > 0) return `This segment has no File Section for ${quoted(unknownPaths)}. Read the overview for the paths it has.`
  const leftOutPaths = knownPaths.filter((path) => !orderedPaths.includes(path))
  if (leftOutPaths.length > 0) return `An order names every File Section exactly once, and this one leaves out ${quoted(leftOutPaths)}.`
  return orderedPaths.length === knownPaths.length ? null : "An order names every File Section exactly once, and this one names a path twice."
}

const absenceProblemOf = (segment: Segment, edit: DocumentEdit): string | null => {
  if (edit.journeyAbsence !== undefined && segment.journey !== null) {
    return "This segment has a Journey Flow Diagram, so it takes no reason for a missing one."
  }
  return edit.blastAbsence !== undefined && segment.blast !== null
    ? "This segment has a Blast Diagram, so it takes no reason for a missing one."
    : null
}

const textsOf = (edit: DocumentEdit): string[] => [
  edit.context ?? "",
  edit.intro ?? "",
  edit.journeyAbsence ?? "",
  edit.blastAbsence ?? "",
]

const orderedFiles = (files: readonly FileSection[], orderedPaths: readonly string[] | undefined): readonly FileSection[] =>
  orderedPaths === undefined
    ? files
    : orderedPaths.flatMap((path) => files.filter((file) => file.path === path))

const amendSegment = (segment: Segment, edit: DocumentEdit): Segment => ({
  ...segment,
  context: edit.context ?? segment.context,
  journeyAbsence: edit.journeyAbsence ?? segment.journeyAbsence,
  blastAbsence: edit.blastAbsence ?? segment.blastAbsence,
  walkthrough: {
    intro: edit.intro === undefined ? segment.walkthrough.intro : edit.intro,
    files: orderedFiles(segment.walkthrough.files, edit.order?.files),
  },
})

export const amendDocument = (artifact: ReviewArtifact, edit: DocumentEdit): ArtifactAmended | Refusal => {
  if (isEmptyEdit(edit)) return refuse(NOTHING_GIVEN_MESSAGE)
  const segmentProblem = segmentProblemOf(artifact, edit.segmentId)
  if (segmentProblem !== null) return refuse(segmentProblem)
  const segment = artifact.segments.find((candidate) => edit.segmentId === undefined || candidate.id === edit.segmentId)
  if (segment === undefined) return refuse(NOTHING_GIVEN_MESSAGE)
  const problem = (edit.order === undefined ? null : orderProblemOf(segment.walkthrough.files, edit.order.files))
    ?? absenceProblemOf(segment, edit)
    ?? linkProblemOf(textsOf(edit), artifact.sources)
  return problem === null
    ? { kind: "amended", artifact: withSegments(artifact, [amendSegment(segment, edit)]) }
    : refuse(problem)
}
