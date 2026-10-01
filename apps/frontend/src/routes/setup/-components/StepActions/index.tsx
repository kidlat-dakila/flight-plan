import { Link } from "@tanstack/react-router"
import Button, { buttonVariants } from "@flightplan/ui/blocks/button"

export interface StepProblem {
  readonly message: string
  readonly field: { readonly owner: string, readonly name: string } | null
}

interface StepActionsProps {
  readonly backStep: string | null
  readonly submitLabel: string
  readonly pendingLabel: string
  readonly isPending: boolean
  readonly isReady?: boolean
  readonly hint?: string | null
  readonly errorMessage: string | null
}

const BACK_LABEL = "Back"

const StepActions = ({
  backStep,
  submitLabel,
  pendingLabel,
  isPending,
  isReady = true,
  hint = null,
  errorMessage,
}: StepActionsProps) => (
  <footer className="mt-6 border-t border-border pt-4">
    {errorMessage === null ? null : <p role="alert" className="pb-3 text-sm text-destructive">{errorMessage}</p>}
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
      <Button type="submit" disabled={isPending || !isReady}>{isPending ? pendingLabel : submitLabel}</Button>
    </div>
  </footer>
)

export default StepActions
