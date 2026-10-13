import Button from "@flightplan/ui/blocks/button"

interface SettingsActionsProps {
  readonly isPending: boolean
  readonly errorMessage: string | null
  readonly savedMessage: string | null
}

const SUBMIT_LABEL = "Save"
const PENDING_LABEL = "Saving…"

const SettingsActions = ({ isPending, errorMessage, savedMessage }: SettingsActionsProps) => (
  <footer className="mt-6 border-t border-border pt-4">
    {errorMessage === null ? null : <p role="alert" className="pb-3 text-sm text-destructive">{errorMessage}</p>}
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <p role="status" className="text-sm text-muted-foreground">{isPending ? null : savedMessage}</p>
      <Button type="submit" disabled={isPending}>{isPending ? PENDING_LABEL : SUBMIT_LABEL}</Button>
    </div>
  </footer>
)

export default SettingsActions
