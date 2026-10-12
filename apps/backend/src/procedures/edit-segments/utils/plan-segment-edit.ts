import type { ReviewArtifact, Segment } from "@flightplan/configurations"
import type { MoveDirection, SegmentEdit } from "./schemas"

export type PlannedSegmentEdit
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact }
    | { readonly kind: "rejected", readonly message: string }

interface SegmentContent {
  readonly title: string
  readonly paths: readonly string[]
}

const EMPTY_LABEL_MESSAGE = "Write a label. A segment cannot be without one."
const NO_FILES_MESSAGE = "Add a file. A segment cannot be without files."
const MISSING_SEGMENT_MESSAGE = "This segment is no longer in the Flight Plan."
const UNWRITTEN_CONTEXT = ""

const EDGE_MESSAGES: Readonly<Record<MoveDirection, string>> = {
  up: "This segment is already the first.",
  down: "This segment is already the last.",
}

const POSITION_OFFSETS: Readonly<Record<MoveDirection, number>> = { up: -1, down: 1 }

const reject = (message: string): PlannedSegmentEdit => ({ kind: "rejected", message })

const plan = (artifact: ReviewArtifact, segments: readonly Segment[]): PlannedSegmentEdit => ({
  kind: "planned",
  artifact: { ...artifact, segments, isSegmented: segments.length > 1 },
})

const quoted = (paths: readonly string[]): string => paths.map((path) => `\`${path}\``).join(", ")

const unchangedFilesMessage = (paths: readonly string[]): string =>
  `${paths.length === 1 ? "This file is not a changed file" : "These files are not changed files"} of the Flight Plan: ${quoted(paths)}.`

const inOrder = (paths: readonly string[]): string[] => [...new Set(paths)].sort((one, two) => one.localeCompare(two))

const normalize = ({ title, paths }: SegmentContent): SegmentContent => ({ title: title.trim(), paths: inOrder(paths) })

const contentProblemOf = (artifact: ReviewArtifact, { title, paths }: SegmentContent): string | null => {
  if (title === "") return EMPTY_LABEL_MESSAGE
  if (paths.length === 0) return NO_FILES_MESSAGE
  const unchangedPaths = paths.filter((path) => !artifact.changedPaths.includes(path))
  return unchangedPaths.length > 0 ? unchangedFilesMessage(unchangedPaths) : null
}

const createSegment = (id: string, { title, paths }: SegmentContent): Segment => ({
  id,
  title,
  changedPaths: paths,
  context: UNWRITTEN_CONTEXT,
  journey: null,
  blast: null,
  walkthrough: { intro: null, files: [] },
})

const withContent = (segment: Segment, { title, paths }: SegmentContent): Segment => {
  const removedPaths = segment.changedPaths.filter((path) => !paths.includes(path))
  return {
    ...segment,
    title,
    changedPaths: paths,
    walkthrough: {
      ...segment.walkthrough,
      files: segment.walkthrough.files.filter((file) => !removedPaths.includes(file.path)),
    },
  }
}

const movedTo = (segments: readonly Segment[], segment: Segment, position: number): Segment[] => {
  const others = segments.filter((other) => other.id !== segment.id)
  return [...others.slice(0, position), segment, ...others.slice(position)]
}

const planAddition = (artifact: ReviewArtifact, content: SegmentContent, newSegmentId: string): PlannedSegmentEdit => {
  const problem = contentProblemOf(artifact, content)
  return problem === null ? plan(artifact, [...artifact.segments, createSegment(newSegmentId, content)]) : reject(problem)
}

const planChange = (artifact: ReviewArtifact, segmentId: string, content: SegmentContent): PlannedSegmentEdit => {
  const problem = contentProblemOf(artifact, content)
  return problem === null
    ? plan(artifact, artifact.segments.map((segment) => (segment.id === segmentId ? withContent(segment, content) : segment)))
    : reject(problem)
}

const planMove = (artifact: ReviewArtifact, segment: Segment, direction: MoveDirection): PlannedSegmentEdit => {
  const position = artifact.segments.indexOf(segment) + POSITION_OFFSETS[direction]
  return position < 0 || position >= artifact.segments.length
    ? reject(EDGE_MESSAGES[direction])
    : plan(artifact, movedTo(artifact.segments, segment, position))
}

export const planSegmentEdit = (artifact: ReviewArtifact, edit: SegmentEdit, newSegmentId: string): PlannedSegmentEdit => {
  if (edit.kind === "add") return planAddition(artifact, normalize(edit), newSegmentId)
  const segment = artifact.segments.find((candidate) => candidate.id === edit.segmentId)
  if (segment === undefined) return reject(MISSING_SEGMENT_MESSAGE)
  if (edit.kind === "change") return planChange(artifact, segment.id, normalize(edit))
  if (edit.kind === "move") return planMove(artifact, segment, edit.direction)
  return plan(artifact, artifact.segments.filter((other) => other.id !== segment.id))
}
