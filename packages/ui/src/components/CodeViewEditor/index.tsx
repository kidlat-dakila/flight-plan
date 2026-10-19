import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import Button from "@/components/blocks/button"
import CodeBlock from "@/components/CodeBlock"
import { FindingChip } from "@/components/FindingMark"
import {
  isLineInRange,
  lineLabelsIn,
  rangeLabelOf,
  rangeOfSelection,
  selectLine,
  type LineRange,
  type LineSelection,
} from "@/lib/line-selection"
import type { CodeLine } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type WaypointOption = "toggle-off" | "toggle-on" | "always-on" | "always-off"

export interface CodeViewWaypoint {
  readonly id: string
  readonly title: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly coreChangeLabel: string | null
}

interface CodeViewEditorProps {
  readonly path: string
  readonly lines: readonly CodeLine[] | null
  readonly statusMessage: string | null
  readonly waypoints: readonly CodeViewWaypoint[]
  readonly waypointOptions: WaypointOption
  readonly highlightButtonLabel: string | null
  readonly focusOn: LineRange | null
  readonly className?: string
  readonly renderWaypoint?: (waypoint: CodeViewWaypoint) => readonly ReactElement[]
  readonly onHighlightCode: ((range: LineRange) => void) | null
}

interface WaypointVisibility {
  readonly isShownAtFirst: boolean
  readonly canToggle: boolean
}

const WAYPOINT_VISIBILITIES: Record<WaypointOption, WaypointVisibility> = {
  "toggle-off": { isShownAtFirst: false, canToggle: true },
  "toggle-on": { isShownAtFirst: true, canToggle: true },
  "always-on": { isShownAtFirst: true, canToggle: false },
  "always-off": { isShownAtFirst: false, canToggle: false },
}

const SHOW_WAYPOINTS_LABEL = "Show waypoints"
const HIDE_WAYPOINTS_LABEL = "Hide waypoints"
const SELECT_LINE_LABEL = "Select line"
const CLEAR_SELECTION_LABEL = "Clear"
const LINE_SELECTOR = "[data-line]"
const DECIMAL = 10
const EXTRA_ROW_CLASSES = "my-1.5 mr-4 ml-18 rounded-md border border-input bg-background font-sans whitespace-normal"

const lineElementOf = (node: Node | null): HTMLElement | null => {
  const element = node instanceof Element ? node : node?.parentElement ?? null
  return element?.closest<HTMLElement>(LINE_SELECTOR) ?? null
}

const lineNumberOf = (element: HTMLElement | null): number => Number.parseInt(element?.dataset.line ?? "", DECIMAL)

const readSelectedLines = (code: HTMLElement | null): LineSelection | null => {
  const selection = window.getSelection()
  if (code === null || selection === null || selection.isCollapsed) return null
  const anchorElement = lineElementOf(selection.anchorNode)
  const headElement = lineElementOf(selection.focusNode)
  if (anchorElement === null || headElement === null || !code.contains(anchorElement) || !code.contains(headElement)) return null
  const anchorLine = lineNumberOf(anchorElement)
  const headLine = lineNumberOf(headElement)
  return Number.isNaN(anchorLine) || Number.isNaN(headLine) ? null : { anchorLine, headLine }
}

const scrollToLine = (code: HTMLElement | null, lineNumber: number): void => {
  code?.querySelector(`[data-line="${String(lineNumber)}"]`)?.scrollIntoView({ block: "center" })
}

const withFocus = (lines: readonly CodeLine[], focusOn: LineRange | null): readonly CodeLine[] =>
  focusOn === null
    ? lines
    : lines.map((line) => ({ ...line, isFocused: isLineInRange(focusOn, Number.parseInt(line.numberLabel, DECIMAL)) }))

const WaypointNote = ({ waypoint }: { readonly waypoint: CodeViewWaypoint }) => (
  <section aria-label={waypoint.title} className={cn(EXTRA_ROW_CLASSES, "flex items-center gap-2 px-2.5 py-2")}>
    {waypoint.coreChangeLabel === null ? null : <FindingChip kind="core-change" label={waypoint.coreChangeLabel} />}
    <span className="min-w-0 truncate text-[0.9375rem] font-semibold">{waypoint.title}</span>
    <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{rangeLabelOf(waypoint)}</span>
  </section>
)

const CodeViewEditor = ({
  path,
  lines,
  statusMessage,
  waypoints,
  waypointOptions,
  highlightButtonLabel,
  focusOn,
  className,
  renderWaypoint,
  onHighlightCode,
}: CodeViewEditorProps) => {
  const codeRef = useRef<HTMLDivElement>(null)
  const { isShownAtFirst, canToggle } = WAYPOINT_VISIBILITIES[waypointOptions]
  const [isToggledOn, setIsToggledOn] = useState(isShownAtFirst)
  const [selection, setSelection] = useState<LineSelection | null>(null)
  const areWaypointsShown = canToggle ? isToggledOn : isShownAtFirst
  const selectedRange = useMemo(() => (selection === null ? null : rangeOfSelection(selection)), [selection])
  const selectedLineLabels = useMemo(() => lineLabelsIn(selectedRange), [selectedRange])
  const focusedLines = useMemo(() => (lines === null ? null : withFocus(lines, focusOn)), [lines, focusOn])
  const focusLineStart = focusOn?.lineStart ?? null
  const hasLines = lines !== null

  useEffect(() => {
    if (focusLineStart !== null && hasLines) scrollToLine(codeRef.current, focusLineStart)
  }, [focusLineStart, hasLines])

  const handleSelectLine = (numberLabel: string, isExtending: boolean) => {
    setSelection((current) => selectLine(current, Number.parseInt(numberLabel, DECIMAL), isExtending))
  }

  const handleMouseUp = () => {
    const selectedLines = onHighlightCode === null ? null : readSelectedLines(codeRef.current)
    if (selectedLines !== null) setSelection(selectedLines)
  }

  const handleHighlight = (range: LineRange) => {
    onHighlightCode?.(range)
    setSelection(null)
  }

  const renderLineExtra = (numberLabel: string) => {
    const lineNumber = Number.parseInt(numberLabel, DECIMAL)
    return (
      <>
        {selectedRange?.lineEnd === lineNumber
          ? (
              <div role="toolbar" aria-label={rangeLabelOf(selectedRange)} className={cn(EXTRA_ROW_CLASSES, "flex items-center gap-2 px-2.5 py-1.5")}>
                <span className="text-sm text-muted-foreground tabular-nums">{rangeLabelOf(selectedRange)}</span>
                <span className="flex-1" />
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelection(null) }}>{CLEAR_SELECTION_LABEL}</Button>
                <Button type="button" size="sm" onClick={() => { handleHighlight(selectedRange) }}>{highlightButtonLabel}</Button>
              </div>
            )
          : null}
        {areWaypointsShown
          ? waypoints.filter((waypoint) => waypoint.lineEnd === lineNumber).map((waypoint) => (
              renderWaypoint === undefined
                ? <WaypointNote key={waypoint.id} waypoint={waypoint} />
                : <div key={waypoint.id}>{renderWaypoint(waypoint)}</div>
            ))
          : null}
      </>
    )
  }

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border", className)}>
      <div className="flex h-10 shrink-0 items-center gap-3 border-b bg-muted pr-1 pl-3">
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={path}>{path}</p>
        {canToggle
          ? (
              <Button type="button" variant="ghost" size="sm" aria-pressed={isToggledOn} onClick={() => { setIsToggledOn((isOn) => !isOn) }}>
                {isToggledOn ? HIDE_WAYPOINTS_LABEL : SHOW_WAYPOINTS_LABEL}
              </Button>
            )
          : null}
      </div>
      {focusedLines === null
        ? <p role="status" className="px-3 py-2.5 text-sm text-muted-foreground">{statusMessage}</p>
        : (
            <div
              ref={codeRef}
              role="presentation"
              className="min-h-0 flex-1 overflow-y-auto bg-code"
              onMouseUp={handleMouseUp}
            >
              <CodeBlock
                lines={focusedLines}
                label={path}
                path={path}
                className="py-0"
                renderLineExtra={renderLineExtra}
                {...(onHighlightCode === null
                  ? {}
                  : { selectLineLabel: SELECT_LINE_LABEL, selectedLineLabels, onSelectLine: handleSelectLine })}
              />
            </div>
          )}
    </div>
  )
}

export default CodeViewEditor
