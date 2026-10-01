import { LINE_COLOR_CLASSES, type LineColor } from "@/lib/line-color"
import { cn } from "@/lib/utils"

type BandLineColor = LineColor | "primary"

interface BandLineProps {
  readonly lineColor: BandLineColor
}

const BAND_LINE_COLOR_CLASSES: Record<BandLineColor, string> = {
  ...LINE_COLOR_CLASSES,
  primary: "[--line:var(--primary)]",
}

const BandLine = ({ lineColor }: BandLineProps) => (
  <span
    aria-hidden="true"
    className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-(--line)", BAND_LINE_COLOR_CLASSES[lineColor])}
  />
)

export default BandLine
