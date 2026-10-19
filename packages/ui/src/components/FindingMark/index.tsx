import { PaintbrushIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type FindingMarkKind = "bug" | "risk" | "nit" | "question" | "attention"

interface FindingMarkProps {
  readonly kind: FindingMarkKind
  readonly className?: string
}

interface FindingChipProps {
  readonly kind: FindingMarkKind
  readonly label: string
  readonly className?: string
}

const TONE_CLASSES: Record<FindingMarkKind, string> = {
  bug: "text-destructive",
  risk: "text-destructive",
  nit: "text-nit",
  question: "text-muted-foreground",
  attention: "text-signal-text",
}

const DIAMOND_PATH = "M7 1.5 12.5 7 7 12.5 1.5 7z"
const TRIANGLE_PATH = "M7 1.75 13 12.25H1z"

const NIT_STROKE_WIDTH = 2.5

const GeometricMark = ({ kind, className }: Required<FindingMarkProps>) => (
  <svg aria-hidden="true" viewBox="0 0 14 14" data-kind={kind} className={className}>
    {kind === "bug" ? <path d={DIAMOND_PATH} className="fill-current" /> : null}
    {kind === "risk" ? <path d={DIAMOND_PATH} className="fill-none stroke-current stroke-2" /> : null}
    {kind === "question" ? <circle cx="7" cy="7" r="4.5" className="fill-none stroke-current stroke-2" /> : null}
    {kind === "attention" ? <path d={TRIANGLE_PATH} className="fill-signal" /> : null}
  </svg>
)

const FindingMark = ({ kind, className }: FindingMarkProps) => {
  const markClasses = cn("size-3.5 shrink-0", TONE_CLASSES[kind], className)
  return kind === "nit"
    ? <PaintbrushIcon aria-hidden="true" data-kind={kind} strokeWidth={NIT_STROKE_WIDTH} className={markClasses} />
    : <GeometricMark kind={kind} className={markClasses} />
}

export const FindingChip = ({ kind, label, className }: FindingChipProps) => (
  <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-bold", TONE_CLASSES[kind], className)}>
    <FindingMark kind={kind} />
    <span className="text-box-cap">{label}</span>
  </span>
)

export default FindingMark
