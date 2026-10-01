import { cn } from "@/lib/utils"

interface LineRoundelProps {
  readonly label: string
  readonly className?: string
}

const LineRoundel = ({ label, className }: LineRoundelProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-(--line) text-sm leading-none font-bold text-line-foreground",
      className,
    )}
  >
    <span className="text-box-cap">{label}</span>
  </span>
)

export default LineRoundel
