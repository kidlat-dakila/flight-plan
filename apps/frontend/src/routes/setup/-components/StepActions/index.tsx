import { Link } from "@tanstack/react-router"
import Button, { buttonVariants } from "@flightplan/ui/blocks/button"
import ProblemAlert from "@flightplan/ui/ProblemAlert"

export interface StepProblem {
  readonly message: string
  readonly field: { readonly owner: string, readonly name: string } | null
  readonly onTroubleshoot?: (() => void) | null
}

interface StepActionsProps {
  readonly backStep: string | null
  readonly submitLabel: string
  readonly pendingLabel: string
  readonly isPending: boolean
  readonly isReady?: boolean
  readonly hint?: string | null
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly onSkip?: (() => void) | null
}

const BACK_LABEL = "Back"
const SKIP_LABEL = "Skip for now"

const StepActions = ({
  backStep,
  submitLabel,
  pendingLabel,
  isPending,
  isReady = true,
  hint = null,
  errorMessage,
  onTroubleshoot = null,
  onSkip = null,
}: StepActionsProps) => (
  <footer className="mt-6 border-t border-border pt-4">
    {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} className="pb-3 text-sm text-destructive" />}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {backStep === null
        ? null
        : (
            <Link to="/setup" search={{ step: backStep }} className={buttonVariants({ variant: "ghost" })}>
              <span className="text-box-cap">{BACK_LABEL}</span>
            </Link>
          )}
      <span className="flex-1" />
      {hint === null ? null : <p className="text-sm text-muted-foreground">{hint}</p>}
      {onSkip === null
        ? null
        : <Button type="button" variant="outline" disabled={isPending} onClick={onSkip}>{SKIP_LABEL}</Button>}
      <Button type="submit" disabled={isPending || !isReady}>{isPending ? pendingLabel : submitLabel}</Button>
    </div>
  </footer>
)

export default StepActions
