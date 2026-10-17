import { useCallback, useRef, useState } from "react"
import Avatar from "@/components/Avatar"
import HoverCard, { HoverCardArrow, HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import type { ThreadComment } from "@/components/CommentThread"
import Prose from "@/components/Prose"
import {
  GUTTER_CARD_COLLISION_AVOIDANCE,
  GUTTER_CARD_GAP_PX,
  GUTTER_CARD_PROSE_CLASSES,
  GUTTER_CARD_WIDTH_CLASSES,
  gutterCardPlacementOf,
  stepGutterFocus,
  useClosedOnScroll,
  useGutterCardOwner,
  type GutterCardPlacement,
} from "@/lib/gutter-card"
import type { CodeLinkTargets } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type ThreadMarkKind = "open" | "pending" | "resolved"

export interface MarkedThread {
  readonly id: string
  readonly linesLabel: string
  readonly mark: { readonly kind: ThreadMarkKind, readonly label: string }
  readonly comments: readonly ThreadComment[]
}

interface ThreadMarkProps {
  readonly threads: readonly MarkedThread[]
  readonly isOpen: boolean
  readonly isTabStop: boolean
  readonly onToggle: () => void
}

const HOVER_DELAY_MS = 150
const OPEN_HINT = "Click or press Enter to open"
const KIND_PRIORITY: readonly ThreadMarkKind[] = ["pending", "open", "resolved"]
const NO_CODE_LINKS: CodeLinkTargets = {}
const BUBBLE_PATH = "M3 2.6h8a1.4 1.4 0 0 1 1.4 1.4v4.5a1.4 1.4 0 0 1-1.4 1.4H6.4L4.2 11.7V9.9H3a1.4 1.4 0 0 1-1.4-1.4V4A1.4 1.4 0 0 1 3 2.6z"
const MARK_CLASSES = cn(
  "relative z-1 grid size-[1.125rem] shrink-0 place-items-center rounded-sm",
  "transition-[background-color] duration-[180ms] ease-out hover:bg-muted aria-expanded:bg-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
const LABEL_CLASSES: Record<ThreadMarkKind, string> = {
  open: "font-bold text-foreground",
  pending: "font-bold text-signal-text",
  resolved: "font-bold text-foreground",
}

const ignoreCodeLink = (): void => undefined

const leadKindOf = (threads: readonly MarkedThread[]): ThreadMarkKind =>
  KIND_PRIORITY.find((kind) => threads.some((thread) => thread.mark.kind === kind)) ?? "open"

const BubbleGlyph = ({ kind }: { readonly kind: ThreadMarkKind }) => (
  <svg aria-hidden="true" viewBox="0 0 14 14" data-kind={kind} className="size-3.5 shrink-0">
    {kind === "open" ? <path d={BUBBLE_PATH} className="fill-muted-foreground" /> : null}
    {kind === "pending"
      ? (
          <>
            <path d={BUBBLE_PATH} className="fill-none stroke-signal-text stroke-[1.5]" />
            <circle cx="7" cy="6.25" r="1.6" className="fill-signal" />
          </>
        )
      : null}
    {kind === "resolved" ? <path d={BUBBLE_PATH} className="fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:2_1.4]" /> : null}
  </svg>
)

const ThreadPreview = ({ thread }: { readonly thread: MarkedThread }) => {
  const first = thread.comments.at(0)
  return (
    <section aria-label={thread.mark.label} className="flex flex-col gap-1.5 px-3 py-2.5 not-first:border-t">
      <p className="flex flex-wrap gap-x-[0.5em] text-xs text-muted-foreground tabular-nums">
        <span className={cn(LABEL_CLASSES[thread.mark.kind], "after:ml-[0.5em] after:font-normal after:text-muted-foreground after:content-['•']")}>
          {thread.mark.label}
        </span>
        <span>{thread.linesLabel}</span>
      </p>
      {first === undefined
        ? null
        : (
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2.5">
              <Avatar imageUrl={first.author.avatarUrl} monogram={first.author.monogram} className="size-6" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex items-baseline gap-2 text-sm">
                  <span className="font-semibold">{first.author.name}</span>
                  <span className="text-xs text-muted-foreground">{first.timeLabel}</span>
                </p>
                <div className="line-clamp-2">
                  <Prose blocks={first.body.slice(0, 1)} codeLinks={NO_CODE_LINKS} onOpenCodeLink={ignoreCodeLink} className={GUTTER_CARD_PROSE_CLASSES} />
                </div>
              </div>
            </div>
          )}
    </section>
  )
}

const ThreadMark = ({ threads, isOpen, isTabStop, onToggle }: ThreadMarkProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<GutterCardPlacement | null>(null)
  const { isOwner, claim, release } = useGutterCardOwner(`thread:${threads.map((thread) => thread.id).join(" ")}`)
  const isCardOpen = isOwner && placement !== null && !isOpen
  const closeCard = useCallback(() => {
    setPlacement(null)
    release()
  }, [release])
  const leadKind = leadKindOf(threads)
  useClosedOnScroll(isCardOpen, closeCard)
  return (
    <HoverCard
      open={isCardOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) {
          closeCard()
          return
        }
        setPlacement(gutterCardPlacementOf(triggerRef.current))
        claim()
      }}
    >
      <HoverCardTrigger
        delay={HOVER_DELAY_MS}
        render={<button ref={triggerRef} type="button" />}
        aria-label={threads.map((thread) => `${thread.mark.label}, ${thread.linesLabel}`).join("; ")}
        aria-expanded={isOpen}
        tabIndex={isTabStop ? 0 : -1}
        data-gutter-mark=""
        data-thread-mark={leadKind}
        className={MARK_CLASSES}
        onKeyDown={stepGutterFocus}
        onClick={() => {
          closeCard()
          onToggle()
        }}
      >
        <BubbleGlyph kind={leadKind} />
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
              className={cn("flex flex-col font-sans", GUTTER_CARD_WIDTH_CLASSES)}
            >
              <HoverCardArrow />
              {threads.map((thread) => <ThreadPreview key={thread.id} thread={thread} />)}
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">{OPEN_HINT}</p>
            </HoverCardContent>
          )}
    </HoverCard>
  )
}

export default ThreadMark
