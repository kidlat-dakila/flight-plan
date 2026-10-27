import { ChevronRightIcon } from "lucide-react"
import type { ReactNode } from "react"
import FindingCard from "@/components/FindingCard"
import { FindingChip } from "@/components/FindingMark"
import MissingWriteUp, { WriteUpButtons, type WaypointWriteUp } from "@/components/MissingWriteUp"
import Prose from "@/components/Prose"
import ReviewToggle from "@/components/ReviewToggle"
import { SpotlightChip, type Spotlight } from "@/components/SpotlightMark"
import Unwritten from "@/components/Unwritten"
import { artifactPartMark } from "@/lib/artifact-part"
import type { CodeLinkTargets, Finding, FindingKind, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface WaypointContent {
  readonly id: string
  readonly anchorId: string
  readonly depth: number
  readonly title: string
  readonly isDraft: boolean
  readonly positionLabel: string
  readonly chip: { readonly kind: FindingKind, readonly label: string } | null
  readonly coreChangeLabel: string | null
  readonly reading: ProseBlocks | null
  readonly unwrittenLabel: string
  readonly hint: string | null
  readonly isBeingWritten: boolean
  readonly spotlight: Spotlight | null
  readonly coreChange: ProseBlocks | null
  readonly findings: readonly Finding[]
  readonly isReviewed: boolean
  readonly reviewLabel: string
}

interface WaypointBoxProps {
  readonly waypoint: WaypointContent
  readonly isOpen: boolean
  readonly isCurrent: boolean
  readonly isReviewPending: boolean
  readonly isGuttered?: boolean
  readonly codeLinks: CodeLinkTargets
  readonly actions?: ReactNode
  readonly writeUp?: WaypointWriteUp | null
  readonly onWriteDescription?: (() => void) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggle: () => void
  readonly onReviewedChange: ((isReviewed: boolean) => void) | null
}

const DEPTH_CLASSES = ["ml-18", "ml-24", "ml-30"] as const
const DEEPEST_CLASS = "ml-36"
const GUTTERED_DEPTH_CLASSES = ["ml-28", "ml-34", "ml-40"] as const
const GUTTERED_DEEPEST_CLASS = "ml-46"

const depthClassOf = (depth: number, isGuttered: boolean): string =>
  isGuttered
    ? GUTTERED_DEPTH_CLASSES.find((_depthClass, index) => index === depth) ?? GUTTERED_DEEPEST_CLASS
    : DEPTH_CLASSES.find((_depthClass, index) => index === depth) ?? DEEPEST_CLASS

const WaypointBox = ({
  waypoint,
  isOpen,
  isCurrent,
  isReviewPending,
  isGuttered = false,
  codeLinks,
  actions,
  writeUp = null,
  onWriteDescription = null,
  onOpenCodeLink,
  onToggle,
  onReviewedChange,
}: WaypointBoxProps) => (
  <section
    id={waypoint.anchorId}
    {...artifactPartMark("waypoint", waypoint.id)}
    aria-label={waypoint.title}
    data-current={isCurrent}
    data-reviewed={waypoint.isReviewed}
    data-view-section-id="waypoint-box-section"
    className={cn(
      "my-1.5 mr-4 scroll-mt-(--waypoint-scroll-margin) rounded-md border border-input bg-background font-sans whitespace-normal transition-[border-color,outline-color,opacity] duration-[180ms] ease-out data-[current=true]:border-(--line) data-[current=true]:outline-1 data-[current=true]:outline-(--line) data-[reviewed=true]:opacity-60",
      depthClassOf(waypoint.depth, isGuttered),
    )}
  >
    <div className="flex items-center gap-1 pr-1">
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left"
        onClick={onToggle}
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-out", isOpen ? "rotate-90" : "")}
        />
        {waypoint.chip === null ? null : <FindingChip kind={waypoint.chip.kind} label={waypoint.chip.label} />}
        {waypoint.coreChangeLabel === null ? null : <FindingChip kind="core-change" label={waypoint.coreChangeLabel} />}
        {waypoint.spotlight === null ? null : <SpotlightChip spotlight={waypoint.spotlight} />}
        <Unwritten isPending={waypoint.isDraft} className="w-56 text-[0.9375rem]">
          <span
            className={cn(
              "min-w-0 truncate text-[0.9375rem]",
              waypoint.isDraft ? "font-mono text-sm text-muted-foreground" : "font-semibold",
            )}
          >
            {waypoint.title}
          </span>
        </Unwritten>
        <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{waypoint.positionLabel}</span>
      </button>
      {actions}
      {onReviewedChange === null
        ? null
        : (
            <ReviewToggle
              label={waypoint.reviewLabel}
              isReviewed={waypoint.isReviewed}
              isDisabled={isReviewPending}
              onChange={onReviewedChange}
            />
          )}
    </div>
    {isOpen
      ? (
          <div className="flex flex-col gap-3 border-t px-4 pt-3.5 pb-4 text-base leading-[1.7]">
            {waypoint.reading === null
              ? (
                  <>
                    <MissingWriteUp hint={waypoint.hint} isBeingWritten={waypoint.isBeingWritten} isAuthored={onWriteDescription !== null} />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs empty:hidden">
                      <WriteUpButtons isBeingWritten={waypoint.isBeingWritten} writeUp={writeUp} onWriteDescription={onWriteDescription} />
                    </div>
                  </>
                )
              : <Prose blocks={waypoint.reading} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
            {waypoint.coreChange === null || waypoint.coreChangeLabel === null
              ? null
              : (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <FindingChip kind="core-change" label={waypoint.coreChangeLabel} />
                    <Prose blocks={waypoint.coreChange} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
                  </div>
                )}
            {waypoint.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
            ))}
          </div>
        )
      : null}
  </section>
)

export default WaypointBox
