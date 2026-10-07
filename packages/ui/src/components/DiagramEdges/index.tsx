import { Fragment, useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type EdgeKind = "trigger" | "call" | "value" | "data"

export type Emphasis = "selected" | "hovered"

export interface EdgeMarkers {
  readonly proven: string
  readonly assumed: string
}

interface DiagramEdgesProps {
  readonly width: number
  readonly height: number
  readonly children: (markers: EdgeMarkers) => ReactNode
}

interface DiagramEdgeProps {
  readonly path: string
  readonly kind: EdgeKind
  readonly isAssumed: boolean
  readonly emphasis?: Emphasis | null
  readonly markers: EdgeMarkers
}

const STROKE_CLASSES: Record<EdgeKind, string> = {
  trigger: "",
  call: "",
  value: "[stroke-dasharray:7_5]",
  data: "[stroke-dasharray:1_6] [stroke-linecap:round]",
}

const ARROW_PATH = "M1 1 9 5 1 9z"
const PROVEN_ARROW_CLASSES = "fill-current stroke-current [stroke-linejoin:round] [stroke-width:1.5]"
const ASSUMED_ARROW_CLASSES = "fill-background stroke-current [stroke-linejoin:round] [stroke-width:1.5]"

const EMPHASES: readonly Emphasis[] = ["selected", "hovered"]

export const EMPHASIS_TEXT_CLASSES: Record<Emphasis, string> = {
  selected: "text-primary",
  hovered: "text-primary/60",
}

const markerIdOf = (baseId: string, emphasis: Emphasis | null): string => (emphasis === null ? baseId : `${baseId}-${emphasis}`)

interface ArrowMarkerProps {
  readonly baseId: string
  readonly isAssumed: boolean
  readonly emphasis: Emphasis | null
}

const ArrowMarker = ({ baseId, isAssumed, emphasis }: ArrowMarkerProps) => (
  <marker
    id={markerIdOf(baseId, emphasis)}
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="7"
    markerHeight="7"
    orient="auto-start-reverse"
    className={emphasis === null ? undefined : EMPHASIS_TEXT_CLASSES[emphasis]}
  >
    <path d={ARROW_PATH} className={isAssumed ? ASSUMED_ARROW_CLASSES : PROVEN_ARROW_CLASSES} />
  </marker>
)

const EDGE_CLASSES = "fill-none stroke-current [stroke-linejoin:round] [stroke-width:2]"

const DiagramEdges = ({ width, height, children }: DiagramEdgesProps) => {
  const markerId = useId()
  const markers: EdgeMarkers = { proven: `${markerId}-proven`, assumed: `${markerId}-assumed` }
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      className="pointer-events-none absolute inset-0 text-muted-foreground"
    >
      <defs>
        {[null, ...EMPHASES].map((emphasis) => (
          <Fragment key={emphasis ?? "plain"}>
            <ArrowMarker baseId={markers.proven} isAssumed={false} emphasis={emphasis} />
            <ArrowMarker baseId={markers.assumed} isAssumed emphasis={emphasis} />
          </Fragment>
        ))}
      </defs>
      {children(markers)}
    </svg>
  )
}

export const DiagramEdge = ({ path, kind, isAssumed, emphasis = null, markers }: DiagramEdgeProps) => (
  <path
    d={path}
    data-kind={kind}
    data-assumed={isAssumed}
    data-emphasis={emphasis ?? undefined}
    markerEnd={`url(#${markerIdOf(isAssumed ? markers.assumed : markers.proven, emphasis)})`}
    className={cn(EDGE_CLASSES, STROKE_CLASSES[kind], "transition-colors duration-[180ms] ease-out", emphasis !== null && EMPHASIS_TEXT_CLASSES[emphasis])}
  />
)

export default DiagramEdges
