import { cn } from "@/lib/utils"

export interface Spotlight {
  readonly label: string
  readonly classifications: readonly { readonly key: string, readonly label: string }[]
}

interface SpotlightMarkProps {
  readonly className?: string
}

interface SpotlightChipProps {
  readonly spotlight: Spotlight
  readonly className?: string
}

interface SpotlightRaysProps {
  readonly innerRadius: number
  readonly outerRadius: number
  readonly className?: string
}

const SEPARATOR_CLASSES = "not-last:after:ml-1 not-last:after:font-normal not-last:after:text-muted-foreground not-last:after:content-['•']"
const CENTRE = 8
const RAY_DIRECTIONS: readonly (readonly [number, number])[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]]
const MARK_RAY_INNER_RADIUS = 6.25
const MARK_RAY_OUTER_RADIUS = 8.25
const COORDINATE_DECIMALS = 2

const pointAt = ([x, y]: readonly [number, number], radius: number): string =>
  [CENTRE + x * radius * Math.SQRT1_2, CENTRE + y * radius * Math.SQRT1_2].map((value) => value.toFixed(COORDINATE_DECIMALS)).join(" ")

const rayPathOf = (direction: readonly [number, number], innerRadius: number, outerRadius: number): string =>
  `M${pointAt(direction, innerRadius)}L${pointAt(direction, outerRadius)}`

export const SpotlightRays = ({ innerRadius, outerRadius, className }: SpotlightRaysProps) => (
  <path
    d={RAY_DIRECTIONS.map((direction) => rayPathOf(direction, innerRadius, outerRadius)).join("")}
    className={cn("fill-none stroke-foreground [stroke-linecap:round] [stroke-width:1.6]", className)}
  />
)

const SpotlightMark = ({ className }: SpotlightMarkProps) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" data-kind="spotlight" className={cn("size-3.5 shrink-0", className)}>
    <circle cx={CENTRE} cy={CENTRE} r="4.5" className="fill-none stroke-foreground [stroke-width:1.75]" />
    <SpotlightRays innerRadius={MARK_RAY_INNER_RADIUS} outerRadius={MARK_RAY_OUTER_RADIUS} className="[stroke-width:1.5]" />
  </svg>
)

export const SpotlightChip = ({ spotlight, className }: SpotlightChipProps) => (
  <span className={cn("inline-flex min-w-0 shrink-0 items-center gap-1 text-xs font-bold text-foreground", className)}>
    <SpotlightMark />
    <span className="flex flex-wrap gap-x-1 text-box-cap">
      <span className={SEPARATOR_CLASSES}>{spotlight.label}</span>
      {spotlight.classifications.map((classification) => (
        <span key={classification.key} className={cn("font-normal text-muted-foreground", SEPARATOR_CLASSES)}>{classification.label}</span>
      ))}
    </span>
  </span>
)

export default SpotlightMark
