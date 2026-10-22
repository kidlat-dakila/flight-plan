import type { ComponentProps } from "react"
import { useReadingPosition, type ReadingPosition, type ReadingPositionStore } from "@/routes/pr-reviews/$repoName/-hooks/use-reading-position"
import CodeWalkthrough, { type WalkthroughNavigation } from "@flightplan/ui/CodeWalkthrough"

interface ReadingWalkthroughProps extends Omit<ComponentProps<typeof CodeWalkthrough>, "navigation"> {
  readonly readingPosition: ReadingPositionStore
  readonly navigationOf: (position: ReadingPosition) => WalkthroughNavigation
}

const ReadingWalkthrough = ({ readingPosition, navigationOf, ...walkthrough }: ReadingWalkthroughProps) => (
  <CodeWalkthrough {...walkthrough} navigation={navigationOf(useReadingPosition(readingPosition))} />
)

export default ReadingWalkthrough
