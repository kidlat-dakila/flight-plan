import type { ComponentProps } from "react"
import { useReadingPosition, type ReadingPosition, type ReadingPositionStore } from "@/routes/pr-reviews/$repoName/-hooks/use-reading-position"
import { useWalkthroughState, type WalkthroughState, type WalkthroughStore } from "@/routes/pr-reviews/$repoName/-hooks/walkthrough-store"
import CodeWalkthrough, { type WalkthroughNavigation } from "@flightplan/ui/CodeWalkthrough"

interface ReadingWalkthroughProps extends Omit<ComponentProps<typeof CodeWalkthrough>, "navigation"> {
  readonly readingPosition: ReadingPositionStore
  readonly walkthroughStore: WalkthroughStore
  readonly navigationOf: (position: ReadingPosition, state: WalkthroughState) => WalkthroughNavigation
}

const ReadingWalkthrough = ({ readingPosition, walkthroughStore, navigationOf, ...walkthrough }: ReadingWalkthroughProps) => (
  <CodeWalkthrough {...walkthrough} navigation={navigationOf(useReadingPosition(readingPosition), useWalkthroughState(walkthroughStore))} />
)

export default ReadingWalkthrough
