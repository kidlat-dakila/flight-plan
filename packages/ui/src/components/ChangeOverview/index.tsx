import { useId } from "react"
import BlastFileMark from "@/components/BlastFileMark"
import HoverCard, { HoverCardTrigger } from "@/components/blocks/hover-card"
import { CodeLinkPreview, HOVER_DELAY_MS } from "@/components/CodeLink"
import type { CodeLinkTarget } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type CardChange = "added" | "modified" | "deleted"

export interface ChangeOverviewCard {
  readonly id: string
  readonly label: string
  readonly typeLabel: string
  readonly path: string
  readonly change: CardChange
  readonly changeLabel: string
  readonly waypointAnchorId: string | null
  readonly preview: CodeLinkTarget | null
}

export interface ChangeOverviewRow {
  readonly classification: { readonly key: string, readonly label: string }
  readonly cards: readonly ChangeOverviewCard[]
}

interface ChangeOverviewProps {
  readonly heading: string
  readonly emptyMessage: string | null
  readonly rows: readonly ChangeOverviewRow[]
  readonly onOpenWaypoint: (anchorId: string) => void
}

interface PlateProps {
  readonly card: ChangeOverviewCard
  readonly onOpenWaypoint: (anchorId: string) => void
}

const MARK_RADIUS = 4
const CHANGE_INK_CLASSES: Readonly<Record<CardChange, string>> = {
  added: "[--change:var(--diff-added)]",
  modified: "[--change:var(--line-blue)]",
  deleted: "[--change:var(--diff-removed)]",
}
const PLATE_CLASSES = "relative grid h-full w-full min-w-0 gap-0.5 rounded-[0.3rem] border border-[color-mix(in_oklab,var(--change)_55%,transparent)] bg-(--plate-fill) px-3 pt-3.5 pb-2.5 text-left [--plate-fill:color-mix(in_oklab,var(--change)_8%,var(--card))]"
const PRESSABLE_CLASSES = "cursor-pointer transition-[border-color,box-shadow] duration-[180ms] ease-out hover:border-(--change) hover:ring-1 hover:ring-(--change) focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
const NOTCH_CLASSES = "absolute -top-2 right-2.5 flex items-center gap-1 bg-[linear-gradient(to_bottom,var(--background)_50%,var(--plate-fill)_50%)] px-1.5 text-xs leading-4 font-bold text-(--change)"

const PlateFace = ({ card }: { readonly card: ChangeOverviewCard }) => (
  <>
    <span className={NOTCH_CLASSES}>
      <BlastFileMark mark={card.change} radius={MARK_RADIUS} />
      {card.changeLabel}
    </span>
    <span className="truncate font-mono text-sm font-bold text-foreground">{card.label}</span>
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs leading-4 text-muted-foreground">
      <span className="shrink-0">{card.typeLabel}</span>
      <span aria-hidden="true">•</span>
      <span title={card.path} className="min-w-0 truncate font-mono [direction:rtl]">
        <bdi>{card.path}</bdi>
      </span>
    </span>
  </>
)

const Plate = ({ card, onOpenWaypoint }: PlateProps) => {
  const { waypointAnchorId, change, preview } = card
  const isPressable = waypointAnchorId !== null
  const className = cn(PLATE_CLASSES, CHANGE_INK_CLASSES[change], isPressable ? PRESSABLE_CLASSES : "")
  const openWaypoint = isPressable
    ? () => {
        onOpenWaypoint(waypointAnchorId)
      }
    : undefined
  const face = <PlateFace card={card} />
  if (preview === null) {
    return isPressable
      ? <button type="button" className={className} onClick={openWaypoint}>{face}</button>
      : <div className={className}>{face}</div>
  }
  return (
    <HoverCard>
      <HoverCardTrigger delay={HOVER_DELAY_MS} render={isPressable ? <button type="button" /> : <div />} className={className} onClick={openWaypoint}>
        {face}
      </HoverCardTrigger>
      <CodeLinkPreview target={preview} />
    </HoverCard>
  )
}

const ChangeOverview = ({ heading, emptyMessage, rows, onOpenWaypoint }: ChangeOverviewProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="pt-6">
      <h3 id={headingId} className="pb-3 text-base leading-6 font-bold text-foreground">{heading}</h3>
      {emptyMessage === null ? null : <p className="text-muted-foreground">{emptyMessage}</p>}
      {rows.length === 0
        ? null
        : (
            <ul className="grid gap-5">
              {rows.map((row) => (
                <li key={row.classification.key} aria-label={row.classification.label}>
                  <span className="text-sm leading-5 font-bold text-foreground">{row.classification.label}</span>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-3 gap-y-5 pt-4">
                    {row.cards.map((card) => (
                      <li key={card.id} className="min-w-0">
                        <Plate card={card} onOpenWaypoint={onOpenWaypoint} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}

export default ChangeOverview
