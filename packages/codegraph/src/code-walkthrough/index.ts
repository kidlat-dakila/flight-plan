import type { EncapsulationKind } from "@/ast-graph"
import type { CodeWalkthrough, FileSection, LineRange, Waypoint } from "@flightplan/configurations"

export type WaypointCategory = EncapsulationKind | "import" | "directive" | "type" | "statement" | "file"

export interface LinkedWaypoint extends Waypoint {
  readonly range: LineRange
  readonly category: WaypointCategory
  readonly traceNodeId: string | null
  readonly children: readonly LinkedWaypoint[]
}

export interface LinkedFileSection extends FileSection {
  readonly waypoints: readonly LinkedWaypoint[]
}

export interface LinkedCodeWalkthrough extends CodeWalkthrough {
  readonly files: readonly LinkedFileSection[]
}
