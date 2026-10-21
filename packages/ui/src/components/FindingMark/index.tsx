import { cn } from "@/lib/utils"

export type FindingMarkKind = "bug" | "risk" | "nit" | "question" | "core-change"

interface FindingMarkProps {
  readonly kind: FindingMarkKind
  readonly className?: string
}

interface FindingChipProps {
  readonly kind: FindingMarkKind
  readonly label: string
  readonly className?: string
}

const LABEL_TONE_CLASSES: Record<FindingMarkKind, string> = {
  "bug": "text-destructive",
  "risk": "text-risk-text",
  "nit": "text-nit",
  "question": "text-muted-foreground",
  "core-change": "text-signal-text",
}

const DISC_PATH = "M8 1a7 7 0 1 0 0 14A7 7 0 1 0 8 1z"
const BUG_HOLE_PATH = "M8 4 4 8l4 4 4-4z"
const CORE_CHANGE_HOLE_PATH = "M8 4.25 4.5 10.5h7z"
const RISK_DIAMOND_PATH = "M8 5.6 10.4 8 8 10.4 5.6 8z"
const QUESTION_HOOK_PATH = "M6.45 6.55a1.6 1.6 0 1 1 2.25 1.45c-.45.2-.7.5-.7.95"
const NIT_STROKE_PATH = "M5.9 10.1 10.1 5.9"
const RING_RADIUS = 5.75

const CutDisc = ({ hole, className }: { readonly hole: string, readonly className: string }) => (
  <path d={`${DISC_PATH}${hole}`} fillRule="evenodd" className={className} />
)

export const FindingShapes = ({ kind }: Pick<FindingMarkProps, "kind">) => {
  if (kind === "bug") return <CutDisc hole={BUG_HOLE_PATH} className="fill-destructive" />
  if (kind === "core-change") return <CutDisc hole={CORE_CHANGE_HOLE_PATH} className="fill-signal" />
  if (kind === "risk") {
    return (
      <>
        <circle cx="8" cy="8" r={RING_RADIUS} className="fill-none stroke-risk [stroke-width:2.5]" />
        <path d={RISK_DIAMOND_PATH} className="fill-risk" />
      </>
    )
  }
  if (kind === "question") {
    return (
      <>
        <circle cx="8" cy="8" r={RING_RADIUS} className="fill-none stroke-foreground [stroke-width:2]" />
        <path d={QUESTION_HOOK_PATH} className="fill-none stroke-foreground [stroke-linecap:round] [stroke-width:1.5]" />
        <circle cx="8" cy="11.05" r="0.8" className="fill-foreground" />
      </>
    )
  }
  return (
    <>
      <circle cx="8" cy="8" r={RING_RADIUS} className="fill-none stroke-nit [stroke-width:1.5]" />
      <path d={NIT_STROKE_PATH} className="fill-none stroke-nit [stroke-linecap:round] [stroke-width:2]" />
    </>
  )
}

const FindingMark = ({ kind, className }: FindingMarkProps) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" data-kind={kind} className={cn("size-3.5 shrink-0", className)}>
    <FindingShapes kind={kind} />
  </svg>
)

export const FindingChip = ({ kind, label, className }: FindingChipProps) => (
  <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-bold", LABEL_TONE_CLASSES[kind], className)}>
    <FindingMark kind={kind} />
    <span className="text-box-cap">{label}</span>
  </span>
)

export default FindingMark
