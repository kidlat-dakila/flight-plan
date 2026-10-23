import type { ReactNode } from "react"
import Button from "@flightplan/ui/blocks/button"
import ProblemAlert from "@flightplan/ui/ProblemAlert"

interface PanelActionsProps {
  readonly isPending: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly savedMessage: string | null
  readonly unsavedLabel?: string | null
  readonly question?: ReactNode
  readonly children?: ReactNode
}

const SUBMIT_LABEL = "Save"
const PENDING_LABEL = "Saving…"

const PanelActions = ({
  isPending,
  errorMessage,
  onTroubleshoot,
  savedMessage,
  unsavedLabel = null,
  question = null,
  children,
}: PanelActionsProps) => (
  <footer className="sticky bottom-0 z-10 mt-6 border-t border-border bg-background py-4 before:absolute before:-inset-x-1 before:inset-y-0 before:-z-10 before:bg-background">
    {question}
    {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} className="pb-3 text-sm text-destructive" />}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {children}
      {unsavedLabel === null
        ? <p role="status" className="ml-auto text-sm text-muted-foreground">{isPending ? null : savedMessage}</p>
        : <p className="ml-auto text-sm font-bold">{unsavedLabel}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? PENDING_LABEL : SUBMIT_LABEL}</Button>
    </div>
  </footer>
)

export default PanelActions
