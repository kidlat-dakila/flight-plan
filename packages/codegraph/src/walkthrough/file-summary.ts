import { WAYPOINT_MARK_KINDS } from "@flightplan/configurations"
import type { PreparedWalkthrough, VisibleFile } from "./build"
import { markKindsOf } from "./waypoints"

export type FileMarkKind = Exclude<(typeof WAYPOINT_MARK_KINDS)[number], "plain">

export interface WalkthroughFileSummary {
  readonly path: string
  readonly markKinds: readonly FileMarkKind[]
  readonly waypointCount: number
  readonly reviewedCount: number
  readonly matchCount: number
  readonly isShown: boolean
}

const FILE_MARK_KINDS = WAYPOINT_MARK_KINDS.filter((kind): kind is FileMarkKind => kind !== "plain")

const markKindsOfFile = (file: VisibleFile): FileMarkKind[] => {
  const kinds = new Set(file.entry.waypoints.flatMap(({ waypoint }) => [...markKindsOf(waypoint)]))
  return FILE_MARK_KINDS.filter((kind) => kinds.has(kind))
}

const summarizeFile = (file: VisibleFile, shownFiles: ReadonlySet<VisibleFile>): WalkthroughFileSummary => ({
  path: file.entry.file.path,
  markKinds: markKindsOfFile(file),
  waypointCount: file.waypointEntries.length,
  reviewedCount: file.waypointEntries.filter((waypointEntry) => waypointEntry.isReviewed).length,
  matchCount: file.waypointEntries.filter((waypointEntry) => waypointEntry.isVisible).length,
  isShown: shownFiles.has(file),
})

export const summarizeWalkthroughFiles = (prepared: PreparedWalkthrough): WalkthroughFileSummary[] => {
  const shownFiles = new Set(prepared.shownFiles)
  return prepared.files.map((file) => summarizeFile(file, shownFiles))
}
