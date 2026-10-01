import { cn } from "@/lib/utils"

export type Verdict = "changed" | "breaks" | "behaviour-changes" | "unaffected" | "unassessed"

interface VerdictMarkProps {
  readonly verdict: Verdict
  readonly className?: string
}

const RING_CLASSES: Record<Verdict, string> = {
  "changed": "fill-(--line) stroke-(--line) [stroke-width:2.5]",
  "breaks": "fill-destructive stroke-destructive [stroke-width:2.5]",
  "behaviour-changes": "fill-none stroke-foreground [stroke-width:2.5]",
  "unaffected": "fill-none stroke-muted-foreground [stroke-width:2.5]",
  "unassessed": "fill-none stroke-muted-foreground [stroke-dasharray:3_2.5] [stroke-width:1.5]",
}

const VerdictMark = ({ verdict, className }: VerdictMarkProps) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" data-verdict={verdict} className={cn("size-4 shrink-0", className)}>
    <circle cx="8" cy="8" r="5.5" className={RING_CLASSES[verdict]} />
    {verdict === "behaviour-changes" ? <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" className="fill-foreground" /> : null}
    {verdict === "breaks" ? <path d="M5.5 5.5l5 5m0-5l-5 5" className="fill-none stroke-background [stroke-width:1.75]" /> : null}
  </svg>
)

export default VerdictMark
