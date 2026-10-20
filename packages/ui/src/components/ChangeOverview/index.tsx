import { useId } from "react"
import BlastFileMark from "@/components/BlastFileMark"

export type CardChange = "added" | "modified" | "deleted"

export interface ChangeOverviewCard {
  readonly id: string
  readonly label: string
  readonly typeLabel: string
  readonly path: string
  readonly change: CardChange
  readonly changeLabel: string
  readonly waypointAnchorId: string | null
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

interface CardProps {
  readonly card: ChangeOverviewCard
  readonly onOpenWaypoint: (anchorId: string) => void
}

const MARK_RADIUS = 4
const PLATE_CLASSES = "grid h-full w-full min-w-0 gap-1 rounded-[0.3rem] border border-input bg-card px-3 py-2.5 text-left"
const PRESSABLE_CLASSES = "cursor-pointer transition-[background-color,box-shadow] duration-[180ms] ease-out hover:bg-muted hover:ring-2 hover:ring-(--line) focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"

const CardFace = ({ card }: { readonly card: ChangeOverviewCard }) => (
  <>
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <BlastFileMark mark={card.change} radius={MARK_RADIUS} />
      {card.changeLabel}
    </span>
    <span className="truncate font-mono text-sm font-bold text-foreground">{card.label}</span>
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">{card.typeLabel}</span>
      <span aria-hidden="true">•</span>
      <span title={card.path} className="min-w-0 truncate font-mono">{card.path}</span>
    </span>
  </>
)

const Card = ({ card, onOpenWaypoint }: CardProps) => {
  const { waypointAnchorId } = card
  return waypointAnchorId === null
    ? <div className={PLATE_CLASSES}><CardFace card={card} /></div>
    : (
        <button type="button" className={`${PLATE_CLASSES} ${PRESSABLE_CLASSES}`} onClick={() => { onOpenWaypoint(waypointAnchorId) }}>
          <CardFace card={card} />
        </button>
      )
}

const ChangeOverview = ({ heading, emptyMessage, rows, onOpenWaypoint }: ChangeOverviewProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="pt-6">
      <h3 id={headingId} className="pb-3 text-lg leading-7 font-semibold text-foreground">{heading}</h3>
      {emptyMessage === null ? null : <p className="text-muted-foreground">{emptyMessage}</p>}
      {rows.length === 0
        ? null
        : (
            <ul className="border-t border-border">
              {rows.map((row) => (
                <li
                  key={row.classification.key}
                  aria-label={row.classification.label}
                  className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-6 border-b border-border py-3"
                >
                  <span className="pt-2.5 text-sm font-bold text-foreground">{row.classification.label}</span>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
                    {row.cards.map((card) => (
                      <li key={card.id} className="min-w-0">
                        <Card card={card} onOpenWaypoint={onOpenWaypoint} />
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
