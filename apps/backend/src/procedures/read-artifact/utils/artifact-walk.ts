import type { FileSection, ReviewArtifact, Segment, Waypoint } from "@flightplan/configurations"

export interface LocatedWaypoint {
  readonly segment: Segment
  readonly file: FileSection
  readonly waypoint: Waypoint
  readonly ancestors: readonly Waypoint[]
}

const locateWaypoints = (
  segment: Segment,
  file: FileSection,
  waypoints: readonly Waypoint[],
  ancestors: readonly Waypoint[],
): LocatedWaypoint[] =>
  waypoints.flatMap((waypoint) => [
    { segment, file, waypoint, ancestors },
    ...locateWaypoints(segment, file, waypoint.children, [...ancestors, waypoint]),
  ])

export const waypointsOf = (segment: Segment): LocatedWaypoint[] =>
  segment.walkthrough.files.flatMap((file) => locateWaypoints(segment, file, file.waypoints, []))

export const segmentsIn = (artifact: ReviewArtifact, segmentId: string | null): Segment[] =>
  artifact.segments.filter((segment) => segmentId === null || segment.id === segmentId)

export const unknownSegmentMessage = (artifact: ReviewArtifact, segmentId: string): string =>
  `This artifact has no segment with the id ${segmentId}. Its segments are: ${artifact.segments.map((segment) => segment.id).join(", ")}.`
