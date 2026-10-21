import type { MoveDirection } from "@/procedures/edit-segments/utils/schemas"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { unresolvedLinkIdsIn } from "@/procedures/update-nodes/utils/written-links"
import type { CodeWalkthrough, FileSection, ReviewArtifact, Segment, Waypoint } from "@flightplan/configurations"
import type { WalkthroughEdit } from "./schemas"

export type PlannedWalkthroughEdit
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact }
    | { readonly kind: "rejected", readonly message: string }

type WaypointChange = Extract<WalkthroughEdit, { readonly kind: "change-waypoint" }>

type FileMove = Extract<WalkthroughEdit, { readonly kind: "move-file" }>

const MISSING_SEGMENT_MESSAGE = "This segment is no longer in the Flight Plan."
const MISSING_FILE_MESSAGE = "This file is no longer in the Code Walkthrough."
const MISSING_WAYPOINT_MESSAGE = "This waypoint is no longer in the Code Walkthrough."
const EMPTY_TITLE_MESSAGE = "Write the title. A waypoint cannot be without one."
const CHANGED_FILES_MESSAGE = "The files of this Code Walkthrough have changed since. Try again."

const EDGE_MESSAGES: Readonly<Record<MoveDirection, string>> = {
  up: "This file is already the first.",
  down: "This file is already the last.",
}

const POSITION_OFFSETS: Readonly<Record<MoveDirection, number>> = { up: -1, down: 1 }

const reject = (message: string): PlannedWalkthroughEdit => ({ kind: "rejected", message })

const unresolvedLinksMessage = (linkIds: readonly string[]): string =>
  `${linkIds.length === 1 ? "This code link points" : "These code links point"} at code the Flight Plan does not hold: ${linkIds.join(", ")}.`

const planWalkthrough = (artifact: ReviewArtifact, segment: Segment, walkthrough: CodeWalkthrough): PlannedWalkthroughEdit => ({
  kind: "planned",
  artifact: {
    ...artifact,
    segments: artifact.segments.map((other) => (other.id === segment.id ? { ...segment, walkthrough } : other)),
  },
})

const plan = (artifact: ReviewArtifact, segment: Segment, files: readonly FileSection[]): PlannedWalkthroughEdit =>
  planWalkthrough(artifact, segment, { ...segment.walkthrough, files })

const movedTo = (files: readonly FileSection[], file: FileSection, position: number): FileSection[] => {
  const others = files.filter((other) => other.path !== file.path)
  return [...others.slice(0, position), file, ...others.slice(position)]
}

const isSameFileSet = (files: readonly FileSection[], paths: readonly string[]): boolean =>
  files.length === paths.length && files.every((file) => paths.includes(file.path))

const inShownOrder = (files: readonly FileSection[], shownPaths: readonly string[]): FileSection[] =>
  [...files].sort((one, two) => shownPaths.indexOf(one.path) - shownPaths.indexOf(two.path))

const startingOrderOf = ({ files, isArranged }: CodeWalkthrough, shownPaths: readonly string[]): FileSection[] | null => {
  if (isArranged === true) return [...files]
  return isSameFileSet(files, shownPaths) ? inShownOrder(files, shownPaths) : null
}

const planFileMove = (artifact: ReviewArtifact, segment: Segment, file: FileSection, move: FileMove): PlannedWalkthroughEdit => {
  const files = startingOrderOf(segment.walkthrough, move.shownPaths)
  if (files === null) return reject(CHANGED_FILES_MESSAGE)
  const position = files.indexOf(file) + POSITION_OFFSETS[move.direction]
  return position < 0 || position >= files.length
    ? reject(EDGE_MESSAGES[move.direction])
    : planWalkthrough(artifact, segment, { files: movedTo(files, file, position), isArranged: true })
}

const withWaypointChanged = (waypoints: readonly Waypoint[], change: WaypointChange): Waypoint[] =>
  waypoints.map((waypoint) => {
    const withChildren = { ...waypoint, children: withWaypointChanged(waypoint.children, change) }
    return waypoint.id === change.waypointId
      ? { ...withChildren, title: change.title, reading: change.reading, coreChange: change.coreChange }
      : withChildren
  })

const withoutWaypoint = (waypoints: readonly Waypoint[], waypointId: string): Waypoint[] =>
  waypoints.flatMap((waypoint) =>
    waypoint.id === waypointId
      ? withoutWaypoint(waypoint.children, waypointId)
      : [{ ...waypoint, children: withoutWaypoint(waypoint.children, waypointId) }])

const mapWaypoints = (segment: Segment, change: (waypoints: readonly Waypoint[]) => Waypoint[]): FileSection[] =>
  segment.walkthrough.files.map((file) => ({ ...file, waypoints: change(file.waypoints) }))

const normalize = (change: WaypointChange): WaypointChange => ({
  ...change,
  title: change.title.trim(),
  reading: change.reading.trim(),
  coreChange: change.coreChange === null ? null : change.coreChange.trim(),
})

const planWaypointChange = (artifact: ReviewArtifact, segment: Segment, change: WaypointChange): PlannedWalkthroughEdit => {
  if (change.title === "") return reject(EMPTY_TITLE_MESSAGE)
  const unresolvedLinkIds = unresolvedLinkIdsIn([change.reading, change.coreChange ?? ""], artifact.sources)
  return unresolvedLinkIds.length > 0
    ? reject(unresolvedLinksMessage(unresolvedLinkIds))
    : plan(artifact, segment, mapWaypoints(segment, (waypoints) => withWaypointChanged(waypoints, change)))
}

const planFileEdit = (
  artifact: ReviewArtifact,
  segment: Segment,
  edit: Extract<WalkthroughEdit, { readonly path: string }>,
): PlannedWalkthroughEdit => {
  const file = segment.walkthrough.files.find((candidate) => candidate.path === edit.path)
  if (file === undefined) return reject(MISSING_FILE_MESSAGE)
  return edit.kind === "move-file"
    ? planFileMove(artifact, segment, file, edit)
    : plan(artifact, segment, segment.walkthrough.files.filter((other) => other.path !== file.path))
}

export const planWalkthroughEdit = (artifact: ReviewArtifact, segmentId: string, edit: WalkthroughEdit): PlannedWalkthroughEdit => {
  const segment = artifact.segments.find((candidate) => candidate.id === segmentId)
  if (segment === undefined) return reject(MISSING_SEGMENT_MESSAGE)
  if (edit.kind === "move-file" || edit.kind === "remove-file") return planFileEdit(artifact, segment, edit)
  if (!waypointsOf(segment).some(({ waypoint }) => waypoint.id === edit.waypointId)) return reject(MISSING_WAYPOINT_MESSAGE)
  return edit.kind === "change-waypoint"
    ? planWaypointChange(artifact, segment, normalize(edit))
    : plan(artifact, segment, mapWaypoints(segment, (waypoints) => withoutWaypoint(waypoints, edit.waypointId)))
}
