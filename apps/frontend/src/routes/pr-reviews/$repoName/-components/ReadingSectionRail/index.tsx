import type { ComponentProps } from "react"
import { useCurrentAnchorId, type ReadingPositionStore } from "@/routes/pr-reviews/$repoName/-hooks/use-reading-position"
import SectionRail from "@flightplan/ui/SectionRail"

interface ReadingSectionRailProps extends Omit<ComponentProps<typeof SectionRail>, "currentAnchorId"> {
  readonly readingPosition: ReadingPositionStore
}

const ReadingSectionRail = ({ readingPosition, ...rail }: ReadingSectionRailProps) => (
  <SectionRail {...rail} currentAnchorId={useCurrentAnchorId(readingPosition)} />
)

export default ReadingSectionRail
