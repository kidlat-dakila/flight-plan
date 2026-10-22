import type { ComponentProps } from "react"
import { useStore } from "zustand"
import { useShallow } from "zustand/react/shallow"
import type { WalkthroughStore, WaypointVisit } from "@/routes/pr-reviews/$repoName/-hooks/walkthrough-store"
import type { PreviewVisit } from "@flightplan/ui/FileRows"
import FileSection, { type WalkthroughFile } from "@flightplan/ui/FileSection"

type SteppingProps = "openWaypointIds" | "currentWaypointId" | "focusedWaypointId" | "previewVisit" | "isCollapsed"

interface WalkthroughFileSectionProps extends Omit<ComponentProps<typeof FileSection>, SteppingProps> {
  readonly walkthroughStore: WalkthroughStore
}

const waypointIdsOf = (file: WalkthroughFile): readonly string[] =>
  file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint.id] : []))

const ownWaypointIdOf = (waypointIds: readonly string[], waypointId: string | null): string | null =>
  waypointId !== null && waypointIds.includes(waypointId) ? waypointId : null

const ownVisitOf = (waypointIds: readonly string[], visit: WaypointVisit | null): WaypointVisit | null =>
  visit !== null && waypointIds.includes(visit.waypointId) ? visit : null

const previewVisitOf = (visit: WaypointVisit | null): PreviewVisit | null =>
  visit === null || visit.isOpening ? null : { waypointId: visit.waypointId, count: visit.count }

const WalkthroughFileSection = ({ walkthroughStore, ...section }: WalkthroughFileSectionProps) => {
  const waypointIds = waypointIdsOf(section.file)
  const openWaypointIds = useStore(walkthroughStore, useShallow((state) => waypointIds.filter((waypointId) => state.openWaypointIds.has(waypointId))))
  const currentWaypointId = useStore(walkthroughStore, (state) => ownWaypointIdOf(waypointIds, state.currentWaypointId))
  const focusedWaypointId = useStore(walkthroughStore, (state) => ownWaypointIdOf(waypointIds, state.focusedWaypointId))
  const visit = useStore(walkthroughStore, (state) => ownVisitOf(waypointIds, state.visit))
  const isCollapsed = useStore(walkthroughStore, (state) => state.collapsedAnchorIds.has(section.file.anchorId))
  return (
    <FileSection
      {...section}
      openWaypointIds={new Set(openWaypointIds)}
      currentWaypointId={currentWaypointId}
      focusedWaypointId={focusedWaypointId}
      previewVisit={previewVisitOf(visit)}
      isCollapsed={isCollapsed}
    />
  )
}

export default WalkthroughFileSection
