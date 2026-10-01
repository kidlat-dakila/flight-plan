import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewToggleProps {
  readonly label: string
  readonly isReviewed: boolean
  readonly isDisabled?: boolean
  readonly className?: string
  readonly onChange: (isReviewed: boolean) => void
}

const ReviewToggle = ({ label, isReviewed, isDisabled = false, className, onChange }: ReviewToggleProps) => (
  <button
    type="button"
    aria-pressed={isReviewed}
    disabled={isDisabled}
    className={cn(
      "group/review inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.8rem] hover:bg-muted disabled:opacity-50",
      className,
    )}
    onClick={() => { onChange(!isReviewed) }}
  >
    <span
      aria-hidden="true"
      className="inline-flex size-4 items-center justify-center rounded-full border-[1.5px] border-muted-foreground text-line-foreground transition-colors duration-[180ms] ease-out group-aria-pressed/review:border-(--line) group-aria-pressed/review:bg-(--line)"
    >
      <CheckIcon className="size-3 opacity-0 transition-opacity duration-[180ms] ease-out group-aria-pressed/review:opacity-100" strokeWidth={3} />
    </span>
    <span className="text-box-cap">{label}</span>
  </button>
)

export default ReviewToggle
