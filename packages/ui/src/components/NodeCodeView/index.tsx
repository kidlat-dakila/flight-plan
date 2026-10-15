import { useEffect, useRef, useState } from "react"
import CodeBlock from "@/components/CodeBlock"
import { referenceTabStopRowIdOf, type FileRow } from "@/components/FileSection"
import OutwardLink from "@/components/OutwardLink"
import { HoverProse } from "@/components/Prose"
import WaypointBox from "@/components/WaypointBox"
import type { CodeDefinitions, CodeLine, CodeLinkTargets, ForgeLink, ProseBlocks } from "@/lib/review-content"

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

const toggled = (openIds: ReadonlySet<string>, waypointId: string): ReadonlySet<string> =>
  new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId])

const FOCUSED_LINE_SELECTOR = "[data-focused=\"true\"]"

const isWithin = (numberLabel: string, spans: readonly LineSpan[]): boolean => {
  const lineNumber = Number.parseInt(numberLabel, 10)
  return spans.some(([lineStart, lineEnd]) => lineStart <= lineNumber && lineNumber <= lineEnd)
}

const focusedOn = (lines: readonly CodeLine[], spans: readonly LineSpan[] | null): readonly CodeLine[] =>
  spans === null ? lines : lines.map((line) => ({ ...line, isFocused: isWithin(line.numberLabel, spans) }))

const NodeCodeView = ({ view, focusedLines = null, isReviewPending, codeLinks, codeDefinitions, onOpenCodeLink, onWaypointReviewedChange }: NodeCodeViewProps) => {
  const [openWaypointIds, setOpenWaypointIds] = useState(NOTHING_OPEN)
  const label = `${view.pathLabel}, ${view.rangeLabel}`
  const tabStopRowId = referenceTabStopRowIdOf(view.rows, codeDefinitions)
  const sectionRef = useRef<HTMLElement>(null)
  const renderDefinitionDescription = (description: ProseBlocks) => (
    <HoverProse blocks={description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  )
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
        {view.rows.map((row) => {
          if (row.kind === "lines") {
            return (
              <CodeBlock
                key={row.id}
                lines={focusedOn(row.lines, focusedLines)}
                definitions={codeDefinitions}
                hasReferenceTabStop={row.id === tabStopRowId}
                label={label}
                path={view.pathLabel}
                isWrapped
                className="py-0"
                renderDefinitionDescription={renderDefinitionDescription}
              />
            )
          }
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
