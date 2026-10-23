import { LifeBuoyIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProblemAlertProps {
  readonly message: string
  readonly onTroubleshoot: (() => void) | null
  readonly messageId?: string
  readonly className?: string
}

interface TroubleshootLinkProps {
  readonly onClick: () => void
}

export const TROUBLESHOOT_LABEL = "Troubleshoot"

export const TroubleshootLink = ({ onClick }: TroubleshootLinkProps) => (
  <button
    type="button"
    className="inline-flex shrink-0 items-center gap-1 self-center rounded-sm font-bold underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
    onClick={onClick}
  >
    <LifeBuoyIcon aria-hidden="true" className="size-3.5" />
    {TROUBLESHOOT_LABEL}
  </button>
)

const ProblemAlert = ({ message, onTroubleshoot, messageId, className }: ProblemAlertProps) => (
  <div role="alert" className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
    <p id={messageId}>{message}</p>
    {onTroubleshoot === null ? null : <TroubleshootLink onClick={onTroubleshoot} />}
  </div>
)

export default ProblemAlert
