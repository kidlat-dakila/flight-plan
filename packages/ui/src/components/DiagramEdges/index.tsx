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

const STROKE_CLASSES: Record<EdgeKind, string> = {
  trigger: "",
  call: "",
  value: "[stroke-dasharray:7_5]",
  data: "[stroke-dasharray:1_6] [stroke-linecap:round]",
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

export default DiagramEdges
