import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import HoverCard, { HoverCardArrow, HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import { FindingChip, FindingShapes, type FindingMarkKind } from "@/components/FindingMark"
import LabelSegments from "@/components/LabelSegments"
import MissingWriteUp, { WriteUpButtons, type WaypointWriteUp } from "@/components/MissingWriteUp"
import Prose from "@/components/Prose"
import ReviewToggle from "@/components/ReviewToggle"
import { SpotlightChip, SpotlightRays } from "@/components/SpotlightMark"
import type { WaypointContent } from "@/components/WaypointBox"
import { KeycapButton } from "@/components/WriteUpIcon"
import { artifactPartMark } from "@/lib/artifact-part"
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
  readonly rangeLabel: string | null
  readonly mark: { readonly kind: WaypointMarkKind, readonly label: string }
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
}

export type StemReach = "start" | "middle" | "end" | "single"

export type StemTone = "solid" | "faint" | "quiet"

export interface StemPiece {
  readonly reach: StemReach
  readonly tone: StemTone
  readonly isJoinedAbove: boolean
}

interface WaypointLaneProps {
  readonly stem: StemPiece | null
  readonly hasMark: boolean
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
  readonly writeUp: WaypointWriteUp | null
  readonly onWriteDescription?: (() => void) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggle: () => void
  readonly onReviewedChange: ((isReviewed: boolean) => void) | null
  readonly onPreviewChange: (isPreviewed: boolean) => void
}

const HOVER_DELAY_MS = 150
const EXPAND_LABEL = "Expand"
const STEM_CLASSES = "pointer-events-none absolute left-1/2 -ml-px w-0.5 transition-[opacity,background-color] duration-[180ms] ease-out"
const STEM_TONE_CLASSES: Record<StemTone, string> = {
  solid: "bg-waypoint",
  faint: "bg-waypoint opacity-50",
  quiet: "bg-muted-foreground opacity-35",
}
const ABOVE_MARK_CLASSES = "top-0 h-[0.1875rem]"
const BELOW_MARK_CLASSES = "top-[1.3125rem] bottom-0"
const THROUGH_ROW_CLASSES = "inset-y-0"
const INTO_ROW_CLASSES = "top-0 h-3"
const MARK_CLASSES = cn(
  "relative z-1 grid size-[1.125rem] shrink-0 scroll-mt-[calc(var(--waypoint-scroll-margin)+14rem)] place-items-center rounded-full",
  "transition-[background-color,opacity] duration-[180ms] ease-out hover:bg-muted aria-expanded:bg-muted data-[reviewed=true]:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
const STOP_RADIUS = 5.75
const STOP_DISC_RADIUS = 7
const CURRENT_DOT_RADIUS = 2.25
const CURRENT_HALO_RADIUS = 8
const STOP_RAY_INNER_RADIUS = 9.5
const STOP_RAY_OUTER_RADIUS = 11.75
const REVIEWED_CHECK_PATH = "M5 8.25 7.1 10.25 11 5.9"
const WRITE_UP_DASHES = "[stroke-dasharray:2.4_2.1]"
const CARD_CLASSES = cn("flex flex-col font-sans", GUTTER_CARD_WIDTH_CLASSES)
const segmentClassesOf = ({ reach, isJoinedAbove }: StemPiece, hasMark: boolean): string[] => {
  const above = isJoinedAbove ? [ABOVE_MARK_CLASSES] : []
  if (reach === "start") return [...above, BELOW_MARK_CLASSES]
  if (reach === "single") return above
  if (reach === "middle") return hasMark ? [ABOVE_MARK_CLASSES, BELOW_MARK_CLASSES] : [THROUGH_ROW_CLASSES]
  return [hasMark ? ABOVE_MARK_CLASSES : INTO_ROW_CLASSES]
}

export const WaypointLane = ({ stem, hasMark, children }: WaypointLaneProps) => {
  const segments = stem === null ? [] : segmentClassesOf(stem, hasMark)
  return (
    <span className="relative flex flex-col items-center gap-0.5 self-stretch pt-[0.1875rem]">
      {segments.map((segmentClasses) => (
        <span key={segmentClasses} aria-hidden="true" className={cn(STEM_CLASSES, stem === null ? null : STEM_TONE_CLASSES[stem.tone], segmentClasses)} />
      ))}
      {children}
    </span>
  )
}

const PlainStop = ({ isCurrent }: { readonly isCurrent: boolean }) => (isCurrent
  ? (
      <>
        <circle cx="8" cy="8" r={STOP_RADIUS} className="fill-none stroke-waypoint [stroke-width:2.5]" />
        <circle cx="8" cy="8" r={CURRENT_DOT_RADIUS} className="fill-waypoint" />
      </>
    )
  : <circle cx="8" cy="8" r={STOP_RADIUS} className="fill-none stroke-muted-foreground [stroke-width:2.5]" />)

const ReviewedStop = () => (
  <>
    <circle cx="8" cy="8" r={STOP_DISC_RADIUS} className="fill-waypoint" />
    <path data-reviewed-glyph="" d={REVIEWED_CHECK_PATH} className="fill-none stroke-code [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]" />
  </>
)

const WriteUpStop = ({ isBeingWritten }: { readonly isBeingWritten: boolean }) => (
  <circle
    data-being-written={isBeingWritten}
    cx="8"
    cy="8"
    r={STOP_RADIUS}
    className={cn("origin-center fill-none stroke-muted-foreground [stroke-width:2] [transform-box:fill-box]", WRITE_UP_DASHES, isBeingWritten ? "motion-safe:animate-spin" : "")}
  />
)

const StopShapes = ({ waypoint, isCurrent }: { readonly waypoint: MarkedWaypoint, readonly isCurrent: boolean }) => {
  if (waypoint.isReviewed) return <ReviewedStop />
  if (waypoint.mark.kind !== "plain") return <FindingShapes kind={waypoint.mark.kind} />
  return waypoint.reading === null ? <WriteUpStop isBeingWritten={waypoint.isBeingWritten} /> : <PlainStop isCurrent={isCurrent} />
}

const isPlainStop = (waypoint: MarkedWaypoint): boolean => !waypoint.isReviewed && waypoint.mark.kind === "plain" && waypoint.reading !== null

const MarkGlyph = ({ waypoint, isCurrent }: { readonly waypoint: MarkedWaypoint, readonly isCurrent: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 overflow-visible">
    <StopShapes waypoint={waypoint} isCurrent={isCurrent} />
    {isCurrent && !isPlainStop(waypoint)
      ? <circle cx="8" cy="8" r={CURRENT_HALO_RADIUS} className="fill-none stroke-waypoint [stroke-width:1.25]" />
      : null}
    {waypoint.spotlight === null ? null : <SpotlightRays innerRadius={STOP_RAY_INNER_RADIUS} outerRadius={STOP_RAY_OUTER_RADIUS} />}
  </svg>
)

interface WaypointCardProps extends Pick<WaypointMarkProps, "waypoint" | "isReviewPending" | "codeLinks" | "writeUp" | "onOpenCodeLink" | "onReviewedChange"> {
  readonly onWriteDescription: (() => void) | null
  readonly onExpand: () => void
}

const WaypointCard = ({
  waypoint,
  isReviewPending,
  codeLinks,
  writeUp,
  onOpenCodeLink,
  onReviewedChange,
  onWriteDescription,
  onExpand,
}: WaypointCardProps) => {
  const firstBlock = waypoint.reading?.slice(0, 1) ?? null
  const metaSegments = [waypoint.rangeLabel, waypoint.positionLabel]
    .filter((label) => label !== null)
    .map((text) => ({ text, kind: "plain" as const }))
  return (
    <>
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-2">
        {waypoint.chip === null && waypoint.coreChangeLabel === null && waypoint.spotlight === null
          ? null
          : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {waypoint.chip === null ? null : <FindingChip kind={waypoint.chip.kind} label={waypoint.chip.label} />}
                {waypoint.coreChangeLabel === null ? null : <FindingChip kind="core-change" label={waypoint.coreChangeLabel} />}
                {waypoint.spotlight === null ? null : <SpotlightChip spotlight={waypoint.spotlight} />}
              </div>
            )}
        <p className={cn("leading-5", waypoint.isDraft ? "font-mono text-muted-foreground" : "font-semibold")}>{waypoint.title}</p>
        <LabelSegments segments={metaSegments} className="text-xs text-muted-foreground tabular-nums" />
      </div>
      {firstBlock === null
        ? <MissingWriteUp hint={waypoint.hint} isBeingWritten={waypoint.isBeingWritten} isAuthored={onWriteDescription !== null} className="border-t px-3 py-2" />
        : (
            <div className="line-clamp-3 border-t px-3 py-2">
              <Prose blocks={firstBlock} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} className={GUTTER_CARD_PROSE_CLASSES} />
            </div>
          )}
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 border-t p-1 text-xs">
        {firstBlock === null ? <WriteUpButtons isBeingWritten={waypoint.isBeingWritten} writeUp={writeUp} onWriteDescription={onWriteDescription} /> : null}
        <KeycapButton label={EXPAND_LABEL} keyLabel={WAYPOINT_KEY} variant="ghost" actionId="expand-waypoint-action" onClick={onExpand} />
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
  writeUp,
  onWriteDescription = null,
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
  const expand = (): void => {
    closeCard()
    onToggle()
  }
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
        data-user-action-id="waypoint-mark-action"
        data-current={isCurrent}
        data-reviewed={waypoint.isReviewed}
        className={MARK_CLASSES}
        onKeyDown={stepGutterFocus}
        onClick={expand}
      >
        <MarkGlyph waypoint={waypoint} isCurrent={isCurrent} />
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
              data-view-section-id="waypoint-card-section"
              {...artifactPartMark("waypoint", waypoint.id)}
              className={CARD_CLASSES}
            >
              <HoverCardArrow />
              <WaypointCard
                waypoint={waypoint}
                isReviewPending={isReviewPending}
                codeLinks={codeLinks}
                writeUp={writeUp}
                onWriteDescription={onWriteDescription === null
                  ? null
                  : () => {
                      closeCard()
                      onWriteDescription()
                    }}
                onOpenCodeLink={onOpenCodeLink}
                onReviewedChange={onReviewedChange}
                onExpand={expand}
              />
            </HoverCardContent>
          )}
    </HoverCard>
  )
}

export default WaypointMark
