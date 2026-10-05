import type { FileSection, Finding, Segment, Waypoint } from "@/procedures/get-review/utils/review-artifact"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { FindingEdit, WaypointEdit } from "./schemas"

const QUESTION_KIND = "question"

const toFinding = (edit: FindingEdit): Finding => ({
  id: edit.id,
  kind: edit.kind,
  title: edit.title,
  reading: edit.reading,
  trace: edit.trace ?? null,
  solution: edit.solution ?? null,
})

const editWaypoint = (waypoint: Waypoint, edit: WaypointEdit): Waypoint => ({
  ...waypoint,
  title: edit.title ?? waypoint.title,
  reading: edit.reading ?? waypoint.reading,
  needsAttention: edit.needsAttention === undefined ? waypoint.needsAttention : edit.needsAttention,
  findings: edit.findings === undefined ? waypoint.findings : edit.findings.map(toFinding),
})

const editWaypoints = (waypoints: readonly Waypoint[], editById: ReadonlyMap<string, WaypointEdit>): Waypoint[] =>
  waypoints.map((waypoint) => {
    const withChildren = { ...waypoint, children: editWaypoints(waypoint.children, editById) }
    const edit = editById.get(waypoint.id)
    return edit === undefined ? withChildren : editWaypoint(withChildren, edit)
  })

const overloadedQuestionIds = (edits: readonly WaypointEdit[]): string[] =>
  edits
    .flatMap((edit) => edit.findings ?? [])
    .filter((finding) => finding.kind === QUESTION_KIND && (finding.trace !== undefined || finding.solution !== undefined))
    .map((finding) => finding.id)

const positionProblemOf = (file: FileSection, positionById: ReadonlyMap<string, number>): string | null => {
  const positions = file.waypoints.flatMap((waypoint) => {
    const position = positionById.get(waypoint.id)
    return position === undefined ? [] : [{ id: waypoint.id, position }]
  })
  const pastEnd = positions.find(({ position }) => position > file.waypoints.length)
  if (pastEnd !== undefined) {
    return `\`${pastEnd.id}\` cannot go to position ${String(pastEnd.position)}: \`${file.path}\` has ${String(file.waypoints.length)} top-level waypoints.`
  }
  const shared = positions.find(({ id, position }) => positions.some((other) => other.id !== id && other.position === position))
  return shared === undefined
    ? null
    : `Two waypoints were given position ${String(shared.position)} in \`${file.path}\`. One position holds one waypoint.`
}

const placeWaypoints = (file: FileSection, positionById: ReadonlyMap<string, number>): FileSection => {
  const moved = file.waypoints.filter((waypoint) => positionById.has(waypoint.id))
  if (moved.length === 0) return file
  const unmoved = file.waypoints.filter((waypoint) => !positionById.has(waypoint.id))
  const placed = file.waypoints.reduce<{ readonly waypoints: readonly Waypoint[], readonly unmovedCount: number }>(
    (state, _waypoint, index) => {
      const fixed = moved.find((waypoint) => positionById.get(waypoint.id) === index + 1)
      return fixed === undefined
        ? { waypoints: [...state.waypoints, unmoved[state.unmovedCount]], unmovedCount: state.unmovedCount + 1 }
        : { waypoints: [...state.waypoints, fixed], unmovedCount: state.unmovedCount }
    },
    { waypoints: [], unmovedCount: 0 },
  )
  return { ...file, waypoints: placed.waypoints }
}

const moveProblemOf = (segments: readonly Segment[], positionById: ReadonlyMap<string, number>): string | null => {
  const files = segments.flatMap((segment) => segment.walkthrough.files)
  const topLevelIds = new Set(files.flatMap((file) => file.waypoints.map((waypoint) => waypoint.id)))
  const nestedIds = [...positionById.keys()].filter((id) => !topLevelIds.has(id))
  if (nestedIds.length > 0) {
    return `${nestedIds.map((id) => `\`${id}\``).join(", ")} cannot take a position: only a file's top-level waypoints can be reordered.`
  }
  return files.map((file) => positionProblemOf(file, positionById)).find((problem) => problem !== null) ?? null
}

const amendSegment = (
  segment: Segment,
  editById: ReadonlyMap<string, WaypointEdit>,
  positionById: ReadonlyMap<string, number>,
): Segment => ({
  ...segment,
  walkthrough: {
    ...segment.walkthrough,
    files: segment.walkthrough.files.map((file) =>
      placeWaypoints({ ...file, waypoints: editWaypoints(file.waypoints, editById) }, positionById)),
  },
})

export const waypointTextsOf = (edits: readonly WaypointEdit[]): string[] =>
  edits.flatMap((edit) => [
    edit.reading ?? "",
    edit.needsAttention ?? "",
    ...(edit.findings ?? []).flatMap((finding) => [finding.title, finding.reading, ...(finding.trace ?? [])]),
  ])

export const amendWaypoints = (segments: readonly Segment[], edits: readonly WaypointEdit[]): SegmentsOutcome => {
  const knownIds = segments.flatMap((segment) => waypointsOf(segment).map((located) => located.waypoint.id))
  const idProblem = idProblemOf("waypoint", edits.map((edit) => edit.id), knownIds)
  if (idProblem !== null) return refuse(idProblem)
  const questionIds = overloadedQuestionIds(edits)
  if (questionIds.length > 0) {
    return refuse(`A question carries no trace and no solution: ${questionIds.map((id) => `\`${id}\``).join(", ")}. A claim with a proof or a fix is a bug, a risk or a nit.`)
  }
  const positionById = new Map(edits.flatMap((edit) => (edit.position === undefined ? [] : [[edit.id, edit.position] as const])))
  const moveProblem = moveProblemOf(segments, positionById)
  if (moveProblem !== null) return refuse(moveProblem)
  const editById = new Map(edits.map((edit) => [edit.id, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editById, positionById)) }
}

export const repeatedFindingIdsIn = (segments: readonly Segment[], edits: readonly WaypointEdit[]): string[] => {
  const storedIds = segments.flatMap((segment) =>
    waypointsOf(segment).flatMap((located) => located.waypoint.findings.map((finding) => finding.id)))
  const writtenIds = new Set(edits.flatMap((edit) => (edit.findings ?? []).map((finding) => finding.id)))
  return [...writtenIds].filter((id) => storedIds.filter((storedId) => storedId === id).length > 1)
}
