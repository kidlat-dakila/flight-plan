import { useEffect, useRef, useState } from "react"
import FileRows, { type FileRootBlock, type FileRow, type FileThread } from "@/components/FileRows"
import OutwardLink from "@/components/OutwardLink"
import type { CodeDefinitions, CodeLine, CodeLinkTargets, ForgeLink } from "@/lib/review-content"

export type LineSpan = readonly [number, number]

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
  readonly focusedLines?: readonly LineSpan[] | null
  readonly isReviewPending: boolean
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const NOTHING_OPEN: ReadonlySet<string> = new Set()
const NO_ROOT_BLOCKS: readonly FileRootBlock[] = []
const NO_THREADS: readonly FileThread[] = []

const toggled = (openIds: ReadonlySet<string>, waypointId: string): ReadonlySet<string> =>
  new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId])

const FOCUSED_LINE_SELECTOR = "[data-focused=\"true\"]"

const isWithin = (numberLabel: string, spans: readonly LineSpan[]): boolean => {
  const lineNumber = Number.parseInt(numberLabel, 10)
  return spans.some(([lineStart, lineEnd]) => lineStart <= lineNumber && lineNumber <= lineEnd)
}

const focusedOn = (lines: readonly CodeLine[], spans: readonly LineSpan[] | null): readonly CodeLine[] =>
  spans === null ? lines : lines.map((line) => ({ ...line, isFocused: isWithin(line.numberLabel, spans) }))

const shownRowsOf = ({ id, rows }: CodeView, focusedLines: readonly LineSpan[] | null): readonly FileRow[] =>
  rows.map((row) => {
    if (row.kind === "lines") return { ...row, lines: focusedOn(row.lines, focusedLines) }
    if (row.kind === "waypoint") return { ...row, waypoint: { ...row.waypoint, anchorId: `${id}-${row.waypoint.anchorId}` } }
    return row
  })

const NodeCodeView = ({ view, focusedLines = null, isReviewPending, codeLinks, codeDefinitions, onOpenCodeLink, onWaypointReviewedChange }: NodeCodeViewProps) => {
  const [openWaypointIds, setOpenWaypointIds] = useState(NOTHING_OPEN)
  const label = `${view.pathLabel}, ${view.rangeLabel}`
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (focusedLines !== null) sectionRef.current?.querySelector(FOCUSED_LINE_SELECTOR)?.scrollIntoView({ block: "center" })
  }, [focusedLines])
  return (
    <section ref={sectionRef} aria-label={`${view.heading}, ${label}`} data-reference-scope="" className="border-t">
      <h4 className="px-4 pt-3 text-xs text-muted-foreground">
        <span className="font-bold">{view.heading}</span>
        {view.countLabel === null ? null : <span className="tabular-nums">{` • ${view.countLabel}`}</span>}
      </h4>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
        <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{view.pathLabel}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{view.rangeLabel}</span>
      </div>
      <div className="border-y bg-code">
        <FileRows
          path={view.pathLabel}
          label={label}
          rows={shownRowsOf(view, focusedLines)}
          rootBlocks={NO_ROOT_BLOCKS}
          threads={NO_THREADS}
          openWaypointIds={openWaypointIds}
          currentWaypointId={null}
          focusedWaypointId={null}
          isWrapped
          isReviewPending={isReviewPending}
          commenting={null}
          codeLinks={codeLinks}
          codeDefinitions={codeDefinitions}
          onOpenCodeLink={onOpenCodeLink}
          onToggleWaypoint={(waypointId) => { setOpenWaypointIds((openIds) => toggled(openIds, waypointId)) }}
          onWaypointReviewedChange={onWaypointReviewedChange}
          onRootBlockReviewedChange={null}
        />
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
