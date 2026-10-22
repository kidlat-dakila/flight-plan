import { useHeldPlaceScrolling } from "@/routes/pr-reviews/$repoName/-hooks/use-walkthrough-navigation"
import { useVisitScrolling } from "@/routes/pr-reviews/$repoName/-hooks/use-waypoint-stepping"
import type { WalkthroughStore } from "@/routes/pr-reviews/$repoName/-hooks/walkthrough-store"

interface WalkthroughScrollingProps {
  readonly walkthroughStore: WalkthroughStore
}

const WalkthroughScrolling = ({ walkthroughStore }: WalkthroughScrollingProps) => {
  useVisitScrolling(walkthroughStore)
  useHeldPlaceScrolling(walkthroughStore)
  return null
}

export default WalkthroughScrolling
