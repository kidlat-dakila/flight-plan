import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type BlastFileMarkKind
  = | "added"
    | "modified"
    | "deleted"
    | "breaks"
    | "behaviour-changes"
    | "plain"

interface BlastFileMarkProps {
  readonly mark: BlastFileMarkKind
  readonly radius: number
  readonly className?: string
}

interface MarkShape {
  readonly centre: number
  readonly radius: number
}

const HALO_GAP = 3
const HALO_STROKE_ALLOWANCE = 1
const BOTH_SIDES = 2
const GLYPH_REACH_RATIO = 0.5
const GLYPH_WEIGHT_RATIO = 0.3
const MIN_GLYPH_WEIGHT = 1.5

const CHANGE_INKS: Readonly<Record<"added" | "modified" | "deleted", string>> = {
  added: "var(--diff-added)",
  modified: "var(--line-blue)",
  deleted: "var(--diff-removed)",
}

export const blastFileMarkSizeOf = (radius: number): number => (radius + HALO_GAP + HALO_STROKE_ALLOWANCE) * BOTH_SIDES

export const isQuietBlastFileMark = (mark: BlastFileMarkKind): boolean => mark === "plain"

const glyphWeightOf = (radius: number): number => Math.max(MIN_GLYPH_WEIGHT, radius * GLYPH_WEIGHT_RATIO)

const barPath = ({ centre, radius }: MarkShape): string => {
  const reach = radius * GLYPH_REACH_RATIO
  return `M${String(centre - reach)} ${String(centre)}h${String(reach * BOTH_SIDES)}`
}

const plusPath = (shape: MarkShape): string => {
  const reach = shape.radius * GLYPH_REACH_RATIO
  return `${barPath(shape)}M${String(shape.centre)} ${String(shape.centre - reach)}v${String(reach * BOTH_SIDES)}`
}

const crossPath = ({ centre, radius }: MarkShape): string => {
  const reach = radius * GLYPH_REACH_RATIO
  const span = reach * BOTH_SIDES
  return `M${String(centre - reach)} ${String(centre - reach)}l${String(span)} ${String(span)}m0 ${String(-span)}l${String(-span)} ${String(span)}`
}

const rightHalfPath = ({ centre, radius }: MarkShape): string =>
  `M${String(centre)} ${String(centre - radius)}a${String(radius)} ${String(radius)} 0 0 1 0 ${String(radius * BOTH_SIDES)}z`

interface GlyphProps {
  readonly path: string
  readonly radius: number
}

const Glyph = ({ path, radius }: GlyphProps) => (
  <path d={path} strokeWidth={glyphWeightOf(radius)} className="fill-none stroke-background [stroke-linecap:round]" />
)

interface ChangedFileProps {
  readonly shape: MarkShape
  readonly ink: string
  readonly children?: ReactNode
}

const ChangedFile = ({ shape: { centre, radius }, ink, children = null }: ChangedFileProps) => (
  <>
    <circle cx={centre} cy={centre} r={radius} fill={ink} />
    <circle cx={centre} cy={centre} r={radius + HALO_GAP} stroke={ink} className="fill-none [stroke-width:1.5]" />
    {children}
  </>
)

const drawMark = (mark: BlastFileMarkKind, shape: MarkShape): ReactNode => {
  const { centre, radius } = shape
  switch (mark) {
    case "added": return <ChangedFile shape={shape} ink={CHANGE_INKS.added}><Glyph path={plusPath(shape)} radius={radius} /></ChangedFile>
    case "modified": return <ChangedFile shape={shape} ink={CHANGE_INKS.modified} />
    case "deleted": return <ChangedFile shape={shape} ink={CHANGE_INKS.deleted}><Glyph path={barPath(shape)} radius={radius} /></ChangedFile>
    case "breaks": return (
      <>
        <circle cx={centre} cy={centre} r={radius} className="fill-destructive" />
        <Glyph path={crossPath(shape)} radius={radius} />
      </>
    )
    case "behaviour-changes": return (
      <>
        <circle cx={centre} cy={centre} r={radius} className="fill-background stroke-foreground [stroke-width:2]" />
        <path d={rightHalfPath(shape)} className="fill-foreground" />
      </>
    )
    case "plain": return <circle cx={centre} cy={centre} r={radius} className="fill-muted-foreground" />
  }
}

const BlastFileMark = ({ mark, radius, className }: BlastFileMarkProps) => {
  const size = blastFileMarkSizeOf(radius)
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${String(size)} ${String(size)}`} data-mark={mark} className={cn("shrink-0", className)}>
      {drawMark(mark, { centre: size / BOTH_SIDES, radius })}
    </svg>
  )
}

export default BlastFileMark
