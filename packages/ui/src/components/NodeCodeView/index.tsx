import { useState } from "react"
import CodeBlock from "@/components/CodeBlock"
import type { FileRow } from "@/components/FileSection"
import OutwardLink from "@/components/OutwardLink"
import WaypointBox from "@/components/WaypointBox"
import type { CodeDefinitions, CodeLinkTargets, ForgeLink } from "@/lib/review-content"

export interface CodeView {
  readonly id: string
  readonly heading: string
  readonly countLabel: string | null
  readonly pathLabel: string
  readonly rangeLabel: string
  readonly rows: readonly FileRow[]
  readonly note: string | null
  readonly forgeLink: ForgeLink | null
}

interface NodeCodeViewProps {
  readonly view: CodeView
  readonly isReviewPending: boolean
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const NOTHING_OPEN: ReadonlySet<string> = new Set()

const toggled = (openIds: ReadonlySet<string>, waypointId: string): ReadonlySet<string> =>
  new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId])

const NodeCodeView = ({ view, isReviewPending, codeLinks, codeDefinitions, onOpenCodeLink, onWaypointReviewedChange }: NodeCodeViewProps) => {
  const [openWaypointIds, setOpenWaypointIds] = useState(NOTHING_OPEN)
  const label = `${view.pathLabel}, ${view.rangeLabel}`
  return (
    <section aria-label={`${view.heading}, ${label}`} className="border-t">
      <h4 className="px-4 pt-3 text-xs text-muted-foreground">
        <span className="font-bold">{view.heading}</span>
        {view.countLabel === null ? null : <span className="tabular-nums">{` • ${view.countLabel}`}</span>}
      </h4>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
        <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{view.pathLabel}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{view.rangeLabel}</span>
      </div>
      <div className="border-y bg-code">
        {view.rows.map((row) => {
          if (row.kind === "lines") return <CodeBlock key={row.id} lines={row.lines} definitions={codeDefinitions} label={label} path={view.pathLabel} isWrapped className="py-0" />
          if (row.kind === "gap") {
            return <p key={row.id} className="border-y bg-muted/60 py-0.5 pl-18 font-mono text-xs text-muted-foreground">{row.label}</p>
          }
          return (
            <WaypointBox
              key={row.id}
              waypoint={{ ...row.waypoint, anchorId: `${view.id}-${row.waypoint.anchorId}` }}
              isOpen={openWaypointIds.has(row.waypoint.id)}
              isCurrent={false}
              isReviewPending={isReviewPending}
              codeLinks={codeLinks}
              onOpenCodeLink={onOpenCodeLink}
              onToggle={() => { setOpenWaypointIds((openIds) => toggled(openIds, row.waypoint.id)) }}
              onReviewedChange={onWaypointReviewedChange === null
                ? null
                : (isReviewed) => { onWaypointReviewedChange(row.waypoint.id, isReviewed) }}
            />
          )
        })}
      </div>
      {view.note === null && view.forgeLink === null
        ? null
        : (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2 text-xs">
              {view.note === null ? null : <span className="text-muted-foreground">{view.note}</span>}
              {view.forgeLink === null ? null : <OutwardLink href={view.forgeLink.href} label={view.forgeLink.label} />}
            </div>
          )}
    </section>
  )
}

export default NodeCodeView
