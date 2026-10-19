import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import HoverCard, { HoverCardArrow, HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import FindingMark, { FindingChip, type FindingMarkKind } from "@/components/FindingMark"
import LabelSegments from "@/components/LabelSegments"
import Prose from "@/components/Prose"
import ReviewToggle from "@/components/ReviewToggle"
import type { WaypointContent } from "@/components/WaypointBox"
import {
  GUTTER_CARD_COLLISION_AVOIDANCE,
  GUTTER_CARD_GAP_PX,
  GUTTER_CARD_PROSE_CLASSES,
  GUTTER_CARD_WIDTH_CLASSES,
  gutterCardPlacementOf,
  stepGutterFocus,
  useClosedOnScroll,
  useGutterCardOwner,
  useReportedOpening,
  whenScrollSettles,
  type GutterCardPlacement,
} from "@/lib/gutter-card"
import type { CodeLinkTargets } from "@/lib/review-content"
import { cn } from "@/lib/utils"
import { WAYPOINT_KEY } from "@/lib/walkthrough-navigation"

export type WaypointMarkKind = FindingMarkKind | "plain"

export interface MarkedWaypoint extends WaypointContent {
  readonly id: string
  readonly rangeLabel: string | null
  readonly mark: { readonly kind: WaypointMarkKind, readonly label: string }
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
}

export type StemReach = "start" | "middle" | "end" | "single"

export interface StemPiece {
  readonly reach: StemReach
  readonly isSolid: boolean
  readonly isJoinedAbove: boolean
}

interface WaypointLaneProps {
  readonly stem: StemPiece | null
  readonly children?: ReactNode
}

interface WaypointMarkProps {
  readonly waypoint: MarkedWaypoint
  readonly isOpen: boolean
  readonly isCurrent: boolean
  readonly isReviewPending: boolean
  readonly isTabStop: boolean
  readonly previewRequest: number | null
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggle: () => void
  readonly onReviewedChange: ((isReviewed: boolean) => void) | null
  readonly onPreviewChange: (isPreviewed: boolean) => void
}

const HOVER_DELAY_MS = 150
const EXPAND_KEY_HINT = `Click or press ${WAYPOINT_KEY.toUpperCase()} to expand`
const EXPAND_CLICK_HINT = "Click to expand"
const STEM_CLASSES = "pointer-events-none absolute left-1/2 -ml-px w-0.5 bg-(--line) transition-opacity duration-[180ms] ease-out"
const STEM_BELOW_CLASSES: Record<StemReach, string | null> = {
  start: "top-[1.3125rem] bottom-0",
  middle: "inset-y-0",
  end: "top-0 h-3",
  single: null,
}
const MARK_CLASSES = cn(
  "relative z-1 grid size-[1.125rem] shrink-0 scroll-mt-[calc(var(--waypoint-scroll-margin)+14rem)] place-items-center rounded-sm",
  "transition-[background-color,opacity,outline-color] duration-[180ms] ease-out hover:bg-muted aria-expanded:bg-muted",
  "data-[current=true]:outline-1 data-[current=true]:outline-(--line) data-[reviewed=true]:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
const CARD_CLASSES = cn("flex flex-col font-sans", GUTTER_CARD_WIDTH_CLASSES)

export const WaypointLane = ({ stem, children }: WaypointLaneProps) => {
  const toneClasses = stem?.isSolid === true ? "opacity-100" : "opacity-40"
  const belowClasses = stem === null ? null : STEM_BELOW_CLASSES[stem.reach]
  return (
    <span className="relative flex flex-col items-center gap-0.5 self-stretch pt-[0.1875rem]">
      {stem?.isJoinedAbove === true ? <span aria-hidden="true" className={cn(STEM_CLASSES, toneClasses, "top-0 h-[0.1875rem]")} /> : null}
      {belowClasses === null ? null : <span aria-hidden="true" className={cn(STEM_CLASSES, toneClasses, belowClasses)} />}
      {children}
    </span>
  )
}

const PointerGlyph = () => (
  <svg aria-hidden="true" viewBox="0 0 14 14" className="size-3.5 shrink-0 text-(--line)">
    <path d="M2 3h6.6L12.6 7 8.6 11H2z" className="fill-current" />
  </svg>
)

const MarkGlyph = ({ kind }: { readonly kind: WaypointMarkKind }) =>
  (kind === "plain" ? <PointerGlyph /> : <FindingMark kind={kind} />)

const WaypointCard = ({
  waypoint,
  isCurrent,
  isReviewPending,
  codeLinks,
  onOpenCodeLink,
  onReviewedChange,
}: Pick<WaypointMarkProps, "waypoint" | "isCurrent" | "isReviewPending" | "codeLinks" | "onOpenCodeLink" | "onReviewedChange">) => {
  const firstBlock = waypoint.reading?.slice(0, 1) ?? null
  const metaSegments = [waypoint.rangeLabel, waypoint.positionLabel]
    .filter((label) => label !== null)
    .map((text) => ({ text, kind: "plain" as const }))
  return (
    <>
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-2">
        {waypoint.chip === null && waypoint.attentionLabel === null
          ? null
          : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {waypoint.chip === null ? null : <FindingChip kind={waypoint.chip.kind} label={waypoint.chip.label} />}
                {waypoint.attentionLabel === null ? null : <FindingChip kind="attention" label={waypoint.attentionLabel} />}
              </div>
            )}
        <p className={cn("leading-5", waypoint.isDraft ? "font-mono text-muted-foreground" : "font-semibold")}>{waypoint.title}</p>
        <LabelSegments segments={metaSegments} className="text-xs text-muted-foreground tabular-nums" />
      </div>
      <div className="line-clamp-3 border-t px-3 py-2">
        {firstBlock === null
          ? <p className="text-sm text-muted-foreground">{waypoint.unwrittenLabel}</p>
          : <Prose blocks={firstBlock} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} className={GUTTER_CARD_PROSE_CLASSES} />}
      </div>
      <div className="flex min-h-9 items-center gap-2 border-t py-1 pr-1 pl-3 text-xs text-muted-foreground">
        <span>{isCurrent ? EXPAND_KEY_HINT : EXPAND_CLICK_HINT}</span>
        {onReviewedChange === null
          ? null
          : (
              <ReviewToggle
                label={waypoint.reviewLabel}
                isReviewed={waypoint.isReviewed}
                isDisabled={isReviewPending}
                className="ml-auto text-foreground"
                onChange={onReviewedChange}
              />
            )}
      </div>
    </>
  )
}

const WaypointMark = ({
  waypoint,
  isOpen,
  isCurrent,
  isReviewPending,
  isTabStop,
  previewRequest,
  codeLinks,
  onOpenCodeLink,
  onToggle,
  onReviewedChange,
  onPreviewChange,
}: WaypointMarkProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<GutterCardPlacement | null>(null)
  const { isOwner, claim, release } = useGutterCardOwner(`waypoint:${waypoint.id}`)
  const isCardOpen = isOwner && placement !== null && !isOpen
  const openCard = useCallback(() => {
    setPlacement(gutterCardPlacementOf(triggerRef.current))
    claim()
  }, [claim])
  const closeCard = useCallback(() => {
    setPlacement(null)
    release()
  }, [release])
  useClosedOnScroll(isCardOpen, closeCard)
  useReportedOpening(isCardOpen, onPreviewChange)
  useEffect(() => (previewRequest === null ? undefined : whenScrollSettles(openCard)), [previewRequest, openCard])
  return (
    <HoverCard
      open={isCardOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) openCard()
        else closeCard()
      }}
    >
      <HoverCardTrigger
        delay={HOVER_DELAY_MS}
        render={<button ref={triggerRef} type="button" />}
        id={isOpen ? undefined : waypoint.anchorId}
        aria-label={waypoint.mark.label}
        aria-expanded={isOpen}
        tabIndex={isTabStop ? 0 : -1}
        data-gutter-mark=""
        data-waypoint-mark={waypoint.id}
        data-current={isCurrent}
        data-reviewed={waypoint.isReviewed}
        className={MARK_CLASSES}
        onKeyDown={stepGutterFocus}
        onClick={() => {
          closeCard()
          onToggle()
        }}
      >
        <MarkGlyph kind={waypoint.mark.kind} />
      </HoverCardTrigger>
      {placement === null
        ? null
        : (
            <HoverCardContent
              side="top"
              align="start"
              sideOffset={GUTTER_CARD_GAP_PX}
              anchor={placement.anchor}
              collisionPadding={placement.collisionPadding}
              collisionAvoidance={GUTTER_CARD_COLLISION_AVOIDANCE}
              className={CARD_CLASSES}
            >
              <HoverCardArrow />
              <WaypointCard
                waypoint={waypoint}
                isCurrent={isCurrent}
                isReviewPending={isReviewPending}
                codeLinks={codeLinks}
                onOpenCodeLink={onOpenCodeLink}
                onReviewedChange={onReviewedChange}
              />
            </HoverCardContent>
          )}
    </HoverCard>
  )
}

export default WaypointMark
