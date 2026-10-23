import { TroubleshootLink } from "@/components/ProblemAlert"
import { cn } from "@/lib/utils"

interface ToastProps {
  readonly message: string | null
  readonly onTroubleshoot?: (() => void) | null
}

interface ToastBodyProps {
  readonly message: string
  readonly onTroubleshoot: (() => void) | null
}

const TOAST_CLASSES = "rounded-lg border border-foreground bg-popover px-3 py-2 text-sm text-popover-foreground duration-150 animate-in fade-in-0"

const ToastBody = ({ message, onTroubleshoot }: ToastBodyProps) =>
  onTroubleshoot === null
    ? <p className={TOAST_CLASSES}>{message}</p>
    : (
        <div className={cn("pointer-events-auto flex items-baseline gap-3", TOAST_CLASSES)}>
          <p>{message}</p>
          <TroubleshootLink onClick={onTroubleshoot} />
        </div>
      )

const Toast = ({ message, onTroubleshoot = null }: ToastProps) => (
  <div role="status" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
    {message === null ? null : <ToastBody message={message} onTroubleshoot={onTroubleshoot} />}
  </div>
)

export default Toast
