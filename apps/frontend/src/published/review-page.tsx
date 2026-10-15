import { useState } from "react"
import ReviewNotices from "@/routes/pr-reviews/$repoName/-components/ReviewNotices"
import SelectionReference from "@/routes/pr-reviews/$repoName/-components/SelectionReference"
import UnassignedFilesDialog from "@/routes/pr-reviews/$repoName/-components/UnassignedFilesDialog"
import { useCodeSelection } from "@/routes/pr-reviews/$repoName/-hooks/use-code-selection"
import { useScrolledPast } from "@/routes/pr-reviews/$repoName/-hooks/use-scrolled-past"
import { useWaypointStepping } from "@/routes/pr-reviews/$repoName/-hooks/use-waypoint-stepping"
import BandLine from "@flightplan/ui/BandLine"
import BlastBand from "@flightplan/ui/BlastBand"
import BrandMark from "@flightplan/ui/BrandMark"
import CodeWalkthrough from "@flightplan/ui/CodeWalkthrough"
import ContextSection from "@flightplan/ui/ContextSection"
import FileSection from "@flightplan/ui/FileSection"
import GenerationOffer from "@flightplan/ui/GenerationOffer"
import IconButton from "@flightplan/ui/IconButton"
import JourneyBand from "@flightplan/ui/JourneyBand"
import { useCurrentAnchor } from "@flightplan/ui/lib/use-current-anchor"
import { cn } from "@flightplan/ui/lib/utils"
import Prose from "@flightplan/ui/Prose"
import { BandLink, BandMenuButton, OptionsMenu } from "@flightplan/ui/ReviewActions"
import { TitleHeader } from "@flightplan/ui/ReviewHeader"
import SectionRail from "@flightplan/ui/SectionRail"
import SegmentHeading from "@flightplan/ui/SegmentHeading"
import SignBand from "@flightplan/ui/SignBand"
import type { PublishedReview } from "./published-review"
import UnavailableFeatureDialog from "./unavailable-feature-dialog"

interface PublishedReviewPageProps {
  readonly review: PublishedReview
  readonly logoSrc: string
}

const PRODUCT_NAME = "Flight Plan"
const BACK_TO_TOP_AFTER_PX = 480
const ACCENT_LINE_CLASS = "[--line:var(--primary-text)]"
const LAYOUT_VARIABLES = "[--band-height:3.5rem] [--walkthrough-heading-height:2.75rem] [--section-scroll-margin:4.5rem] [--file-header-top:6.25rem] [--waypoint-scroll-margin:9.75rem]"

const ignoreCopy = (): void => undefined
const renderNoEditor = (): null => null

const PublishedReviewPage = ({ review, logoSrc }: PublishedReviewPageProps) => {
  const [isFeatureUnavailable, setIsFeatureUnavailable] = useState(false)
  const [isListingUnassignedFiles, setIsListingUnassignedFiles] = useState(false)
  const stepping = useWaypointStepping(review.segments, review.walkthroughControls.stepping)
  const codeSelection = useCodeSelection()
  const isScrolledDown = useScrolledPast(BACK_TO_TOP_AFTER_PX)
  const railSections = [...review.rail.groups.flatMap((group) => group.sections), ...review.rail.sections]
  const currentAnchorId = useCurrentAnchor(
    railSections.flatMap((section) => [section.anchorId, ...section.children.map((child) => child.anchorId)]),
  )
  const showUnavailableFeature = (): void => {
    setIsFeatureUnavailable(true)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <title>{review.documentTitle}</title>
      <SignBand width="full" brand={<BrandMark logoSrc={logoSrc} name={PRODUCT_NAME} />}>
        <div className="flex min-w-0 flex-1 items-center border-l border-sign-foreground/20 pl-6">
          <BandLine lineColor="primary" />
          <TitleHeader
            title={review.header.title}
            isBranch={review.header.isBranch}
            label={review.header.label}
            actions={(
              <>
                {review.importLink === null ? null : <BandLink href={review.importLink.href} label={review.importLink.label} />}
                <BandMenuButton label={review.actions.shareLabel} onClick={showUnavailableFeature} />
                <BandMenuButton label={review.actions.submitLabel} isPrimary onClick={showUnavailableFeature} />
                <OptionsMenu
                  forgeLink={null}
                  rebuild={{ onUpdate: showUnavailableFeature, onRegenerate: showUnavailableFeature }}
                  onDelete={showUnavailableFeature}
                />
              </>
            )}
          />
        </div>
      </SignBand>
      <main className={cn("w-full px-6 pb-16", ACCENT_LINE_CLASS, LAYOUT_VARIABLES)}>
        <ReviewNotices
          staleNotice={null}
          unassignedFiles={review.unassignedFiles}
          progress={null}
          onShowUnassignedFiles={() => { setIsListingUnassignedFiles(true) }}
          onCopyPrompt={ignoreCopy}
        />
        <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-x-8">
          <aside className="sticky top-[calc(var(--band-height)+0.5rem)] max-h-[calc(100dvh-var(--band-height)-1rem)] self-start overflow-y-auto pt-5 pb-4">
            <SectionRail
              label="Review sections"
              groups={review.rail.groups}
              sections={review.rail.sections}
              currentAnchorId={currentAnchorId}
            />
          </aside>
          <div className="min-w-0">
            {review.segments.map((segment) => (
              <section
                key={segment.id}
                id={segment.anchorId}
                aria-label={segment.heading ?? undefined}
                className="scroll-mt-(--section-scroll-margin) not-first:border-t-4 not-first:border-foreground"
              >
                {segment.heading === null ? null : <SegmentHeading heading={segment.heading} detailLabel={segment.detailLabel} />}
                <ContextSection anchorId={segment.context.anchorId} heading={segment.context.heading}>
                  {segment.context.isDraft
                    ? <p className="text-muted-foreground">{segment.context.unwrittenLabel}</p>
                    : <Prose blocks={segment.context.context} codeLinks={review.codeLinks} onOpenCodeLink={stepping.onOpenCodeLink} />}
                </ContextSection>
                {segment.offers.journey === null
                  ? (
                      <JourneyBand
                        {...segment.journey}
                        codeLinks={review.codeLinks}
                        codeDefinitions={review.codeDefinitions}
                        isReviewPending={false}
                        onOpenCodeLink={stepping.onOpenCodeLink}
                        onWaypointReviewedChange={showUnavailableFeature}
                      />
                    )
                  : (
                      <GenerationOffer
                        kind="board"
                        {...segment.offers.journey}
                        isGenerating={false}
                        errorMessage={null}
                        onGenerate={showUnavailableFeature}
                      />
                    )}
                {segment.offers.blast === null
                  ? null
                  : (
                      <GenerationOffer
                        kind="board"
                        {...segment.offers.blast}
                        isGenerating={false}
                        errorMessage={null}
                        onGenerate={showUnavailableFeature}
                      />
                    )}
                {segment.blast === null
                  ? null
                  : (
                      <BlastBand
                        {...segment.blast}
                        codeLinks={review.codeLinks}
                        renderImpactEditor={null}
                        onOpenCodeLink={stepping.onOpenCodeLink}
                        onOpenFile={stepping.onOpenCodeLink}
                      />
                    )}
                <CodeWalkthrough
                  anchorId={segment.walkthrough.anchorId}
                  heading={segment.walkthrough.heading}
                  coverageLabel={segment.walkthrough.coverageLabel}
                  controls={review.walkthroughControls}
                  positionLabel={stepping.positionLabel ?? review.walkthroughControls.stepping.idleLabel}
                  canStepBack={stepping.canStepBack}
                  canStepForward={stepping.canStepForward}
                  emptyMessage={segment.walkthrough.emptyMessage}
                  onArrangeFiles={null}
                  onPrevious={stepping.onPrevious}
                  onNext={stepping.onNext}
                  onFilterChange={showUnavailableFeature}
                  onShowReviewedChange={showUnavailableFeature}
                >
                  {segment.offers.findings === null
                    ? null
                    : (
                        <GenerationOffer
                          kind="notice"
                          {...segment.offers.findings}
                          isGenerating={false}
                          errorMessage={null}
                          onGenerate={showUnavailableFeature}
                        />
                      )}
                  {segment.walkthrough.files.map((file) => (
                    <FileSection
                      key={file.anchorId}
                      file={file}
                      openWaypointIds={stepping.openWaypointIds}
                      currentWaypointId={stepping.currentWaypointId}
                      isReviewPending={false}
                      composer={review.composer}
                      composingRange={null}
                      isCommentPending={false}
                      renderCommentEditor={renderNoEditor}
                      codeLinks={review.codeLinks}
                      codeDefinitions={review.codeDefinitions}
                      onOpenCodeLink={stepping.onOpenCodeLink}
                      onToggleWaypoint={stepping.onToggleWaypoint}
                      onWaypointReviewedChange={showUnavailableFeature}
                      onFileReviewedChange={showUnavailableFeature}
                      onStartComment={showUnavailableFeature}
                      onAddComment={showUnavailableFeature}
                      onPostComment={showUnavailableFeature}
                      onReply={showUnavailableFeature}
                      onResolveThread={showUnavailableFeature}
                      onDiscardComment={showUnavailableFeature}
                    />
                  ))}
                </CodeWalkthrough>
              </section>
            ))}
          </div>
        </div>
        {isListingUnassignedFiles && review.unassignedFiles !== null
          ? (
              <UnassignedFilesDialog
                title={review.unassignedFiles.title}
                description={review.unassignedFiles.description}
                paths={review.unassignedFiles.paths}
                confirmation={null}
                onClose={() => { setIsListingUnassignedFiles(false) }}
              />
            )
          : null}
        {isFeatureUnavailable
          ? <UnavailableFeatureDialog {...review.unavailableFeature} onClose={() => { setIsFeatureUnavailable(false) }} />
          : null}
        <SelectionReference selection={codeSelection} onComment={showUnavailableFeature} onAsk={null} />
        {isScrolledDown
          ? (
              <IconButton
                icon="top"
                label="Back to top"
                variant="outline"
                className="fixed right-4 bottom-4 z-30"
                onClick={() => {
                  window.scrollTo({ top: 0 })
                }}
              />
            )
          : null}
      </main>
    </div>
  )
}

export default PublishedReviewPage
