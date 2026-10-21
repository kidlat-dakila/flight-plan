import { CheckIcon } from "lucide-react"
import type { ReactNode } from "react"
import Button from "@/components/blocks/button"
import FindingMark from "@/components/FindingMark"
import { NoWriteUpTag } from "@/components/WriteUpIcon"
import { useNavigatorSection, useSectionSteps } from "@/lib/navigator"
import { walkthroughNavigationOf, type WalkthroughNavigationRequest } from "@/lib/walkthrough-navigation"

export type WalkthroughNavigation = Omit<WalkthroughNavigationRequest, "markerOf" | "sectionSteps">

interface CodeWalkthroughProps {
  readonly anchorId: string
  readonly heading: string
  readonly coverageLabel: string
  readonly emptyMessage: string | null
  readonly writeUpNotice?: string | null
  readonly navigation: WalkthroughNavigation
  readonly children: ReactNode
  readonly onArrangeFiles: (() => void) | null
}

const ARRANGE_FILES_LABEL = "Arrange files"

const ReviewedMark = () => (
  <span aria-hidden="true" className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-waypoint text-line-foreground">
    <CheckIcon className="size-2.5" strokeWidth={3.5} />
  </span>
)

const markerOf: WalkthroughNavigationRequest["markerOf"] = (key) => (key === "reviewed" ? <ReviewedMark /> : <FindingMark kind={key} />)

const CodeWalkthrough = ({ anchorId, heading, coverageLabel, emptyMessage, writeUpNotice = null, navigation, children, onArrangeFiles }: CodeWalkthroughProps) => {
  const sectionSteps = useSectionSteps(anchorId)
  useNavigatorSection(anchorId, walkthroughNavigationOf({ ...navigation, markerOf, sectionSteps }))
  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-heading`} data-view-section-id="code-walkthrough-section" className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-10">
      <div className="flex items-center gap-3">
        <h2 id={`${anchorId}-heading`} className="shrink-0 text-2xl leading-9 font-semibold tracking-[-0.02em] whitespace-nowrap text-foreground">{heading}</h2>
        <p className="min-w-0 truncate text-sm text-muted-foreground tabular-nums">{coverageLabel}</p>
        {writeUpNotice === null ? null : <NoWriteUpTag label={writeUpNotice} className="shrink-0" />}
        <span className="flex-1" />
        {onArrangeFiles === null ? null : <Button variant="link" size="sm" onClick={onArrangeFiles}>{ARRANGE_FILES_LABEL}</Button>}
      </div>
      {emptyMessage === null ? null : <p className="pt-6 text-muted-foreground">{emptyMessage}</p>}
      {children}
    </section>
  )
}

export default CodeWalkthrough
