import { cn } from "@/lib/utils"

export type StopStatus
  = | "no-review"
    | "awaiting-review"
    | "awaiting-reply"
    | "stale"
    | "draft"
    | "closed"
    | "merged"

interface StopRingProps {
  readonly status: StopStatus
  readonly tone?: "status" | "signal"
  readonly className?: string
}

const STATE_TRANSITION = "transition-[fill,stroke,stroke-dasharray,stroke-width,opacity] duration-[180ms] ease-out"

const SOLID_STROKE = "[stroke-dasharray:44_0] [stroke-width:3]"
const BROKEN_STROKE = "[stroke-dasharray:4_3.33] [stroke-width:3]"
const THIN_STROKE = "[stroke-dasharray:44_0] [stroke-width:1.5]"

const RING_CLASSES: Record<StopStatus, string> = {
  "no-review": cn("fill-background stroke-muted-foreground", SOLID_STROKE),
  "awaiting-review": cn("fill-background stroke-signal", SOLID_STROKE),
  "awaiting-reply": cn("fill-background stroke-signal", SOLID_STROKE),
  "stale": cn("fill-background stroke-muted-foreground", BROKEN_STROKE),
  "draft": cn("fill-background stroke-muted-foreground", THIN_STROKE),
  "closed": cn("fill-muted-foreground stroke-muted-foreground", SOLID_STROKE),
  "merged": cn("fill-(--line) stroke-(--line)", SOLID_STROKE),
}

const SHOWN = "opacity-100"
const HIDDEN = "opacity-0"

const HALF_CLASSES: Record<StopStatus, string> = {
  "no-review": HIDDEN,
  "awaiting-review": SHOWN,
  "awaiting-reply": HIDDEN,
  "stale": HIDDEN,
  "draft": HIDDEN,
  "closed": HIDDEN,
  "merged": HIDDEN,
}

const CORE_CLASSES: Record<StopStatus, string> = {
  "no-review": HIDDEN,
  "awaiting-review": HIDDEN,
  "awaiting-reply": SHOWN,
  "stale": HIDDEN,
  "draft": HIDDEN,
  "closed": HIDDEN,
  "merged": HIDDEN,
}

const BAR_CLASSES: Record<StopStatus, string> = {
  "no-review": HIDDEN,
  "awaiting-review": HIDDEN,
  "awaiting-reply": HIDDEN,
  "stale": HIDDEN,
  "draft": HIDDEN,
  "closed": SHOWN,
  "merged": HIDDEN,
}

const SIGNAL_STROKE = "stroke-signal"

const ATTENTION_LABEL = "font-bold text-signal-text"
const QUIET_LABEL = "text-muted-foreground"

export const STATUS_LABEL_CLASSES: Record<StopStatus, string> = {
  "no-review": "text-foreground",
  "awaiting-review": ATTENTION_LABEL,
  "awaiting-reply": ATTENTION_LABEL,
  "stale": QUIET_LABEL,
  "draft": QUIET_LABEL,
  "closed": QUIET_LABEL,
  "merged": QUIET_LABEL,
}

const StopRing = ({ status, tone = "status", className }: StopRingProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" data-status={status} className={cn("size-5 shrink-0", className)}>
    <circle cx="10" cy="10" r="7" className={cn(STATE_TRANSITION, RING_CLASSES[status], tone === "signal" ? SIGNAL_STROKE : "")} />
    <path d="M10 4.5a5.5 5.5 0 0 1 0 11z" className={cn("fill-signal", STATE_TRANSITION, HALF_CLASSES[status])} />
    <circle cx="10" cy="10" r="2.75" className={cn("fill-signal", STATE_TRANSITION, CORE_CLASSES[status])} />
    <rect x="5" y="8.5" width="10" height="3" rx="1" className={cn("fill-background", STATE_TRANSITION, BAR_CLASSES[status])} />
  </svg>
)

export default StopRing
