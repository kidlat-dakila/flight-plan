import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type EdgeKind = "trigger" | "call" | "value" | "data"

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
  readonly markers: EdgeMarkers
}

interface EdgeLegendProps {
  readonly items: readonly { readonly kind: "call" | "value" | "data" | "assumed", readonly label: string }[]
}

const STROKE_CLASSES: Record<EdgeKind, string> = {
  trigger: "",
  call: "",
  value: "[stroke-dasharray:7_5]",
  data: "[stroke-dasharray:1_6] [stroke-linecap:round]",
}

const LEGEND_STROKE_CLASSES: Record<EdgeLegendProps["items"][number]["kind"], string> = {
  call: "",
  value: STROKE_CLASSES.value,
  data: STROKE_CLASSES.data,
  assumed: "",
}

const ARROW_PATH = "M1 1 9 5 1 9z"
const PROVEN_ARROW_CLASSES = "fill-current stroke-current [stroke-linejoin:round] [stroke-width:1.5]"
const ASSUMED_ARROW_CLASSES = "fill-background stroke-current [stroke-linejoin:round] [stroke-width:1.5]"

const ArrowMarker = ({ id, isAssumed }: { readonly id: string, readonly isAssumed: boolean }) => (
  <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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
        <ArrowMarker id={markers.proven} isAssumed={false} />
        <ArrowMarker id={markers.assumed} isAssumed />
      </defs>
      {children(markers)}
    </svg>
  )
}

export const DiagramEdge = ({ path, kind, isAssumed, markers }: DiagramEdgeProps) => (
  <path
    d={path}
    data-kind={kind}
    data-assumed={isAssumed}
    markerEnd={`url(#${isAssumed ? markers.assumed : markers.proven})`}
    className={cn(EDGE_CLASSES, STROKE_CLASSES[kind])}
  />
)

export const EdgeLegend = ({ items }: EdgeLegendProps) => {
  const legendId = useId()
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.kind} className="flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 34 10" className="h-2.5 w-8.5">
            <defs>
              <ArrowMarker id={`${legendId}-${item.kind}`} isAssumed={item.kind === "assumed"} />
            </defs>
            <path
              d="M1 5H31"
              markerEnd={`url(#${legendId}-${item.kind})`}
              className={cn(EDGE_CLASSES, LEGEND_STROKE_CLASSES[item.kind])}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export default DiagramEdges
