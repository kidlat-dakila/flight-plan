import type { FileSection, Segment } from "@flightplan/configurations"
import { refuse, type SegmentsOutcome } from "./refusal"
import type { SegmentEdit } from "./schemas"

const quoted = (paths: readonly string[]): string => paths.map((path) => `\`${path}\``).join(", ")

const orderProblemOf = (files: readonly FileSection[], orderedPaths: readonly string[]): string | null => {
  const knownPaths = files.map((file) => file.path)
  const unknownPaths = orderedPaths.filter((path) => !knownPaths.includes(path))
  if (unknownPaths.length > 0) return `This segment has no File Section for ${quoted(unknownPaths)}. Read the overview for the paths it has.`
  const leftOutPaths = knownPaths.filter((path) => !orderedPaths.includes(path))
  if (leftOutPaths.length > 0) return `An order names every File Section exactly once, and this one leaves out ${quoted(leftOutPaths)}.`
  return orderedPaths.length === knownPaths.length ? null : "An order names every File Section exactly once, and this one names a path twice."
}

const orderedFiles = (files: readonly FileSection[], orderedPaths: readonly string[] | undefined): readonly FileSection[] =>
  orderedPaths === undefined
    ? files
    : orderedPaths.flatMap((path) => files.filter((file) => file.path === path))

const NO_DIAGRAM_MESSAGE = "This segment has no Journey Flow Diagram to describe."

const describedJourney = ({ journey }: Segment, description: string | undefined): Segment["journey"] =>
  journey === null || description === undefined ? journey : { ...journey, description }

const amendSegment = (segment: Segment, edit: SegmentEdit): Segment => ({
  ...segment,
  title: edit.title ?? segment.title,
  context: edit.context ?? segment.context,
  journey: describedJourney(segment, edit.journeyDescription),
  walkthrough: { files: orderedFiles(segment.walkthrough.files, edit.order?.files) },
})

export const segmentTextsOf = (edit: SegmentEdit): string[] => [edit.context ?? "", edit.journeyDescription ?? ""]

export const countSegmentEdits = (edit: SegmentEdit): number =>
  [edit.title, edit.context, edit.order, edit.journeyDescription].filter((written) => written !== undefined).length

export const amendSegments = (segments: readonly Segment[], edit: SegmentEdit): SegmentsOutcome => {
  if (edit.journeyDescription !== undefined && segments.some((segment) => segment.journey === null)) return refuse(NO_DIAGRAM_MESSAGE)
  const orderedPaths = edit.order?.files
  const orderProblem = orderedPaths === undefined
    ? null
    : segments.map((segment) => orderProblemOf(segment.walkthrough.files, orderedPaths)).find((problem) => problem !== null)
  return orderProblem === null || orderProblem === undefined
    ? { kind: "amended", segments: segments.map((segment) => amendSegment(segment, edit)) }
    : refuse(orderProblem)
}
