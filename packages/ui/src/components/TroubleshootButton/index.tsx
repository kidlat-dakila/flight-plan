import { LifeBuoyIcon } from "lucide-react"
import { TROUBLESHOOT_LABEL } from "@/components/ProblemAlert"

interface TroubleshootButtonProps {
  readonly onClick: () => void
}

const TroubleshootButton = ({ onClick }: TroubleshootButtonProps) => (
  <button
    type="button"
    aria-label={TROUBLESHOOT_LABEL}
    title={TROUBLESHOOT_LABEL}
    className="flex size-8 shrink-0 items-center justify-center rounded-md text-sign-muted hover:bg-sign-foreground/10 hover:text-sign-foreground focus-visible:outline-2 focus-visible:outline-sign-foreground"
    onClick={onClick}
  >
    <LifeBuoyIcon aria-hidden="true" className="size-4" />
  </button>
)

export default TroubleshootButton
