import TerminusHeading from "@/routes/pr-reviews/$repoName/-components/TerminusHeading"
import Button from "@flightplan/ui/blocks/button"
import IconButton from "@flightplan/ui/IconButton"
import ProblemAlert from "@flightplan/ui/ProblemAlert"

export interface MigrationNoticeText {
  readonly heading: string
  readonly message: string
  readonly actionLabel: string
  readonly updateCommand: string | null
  readonly copyLabel: string
}

interface MigrationNoticeProps {
  readonly notice: MigrationNoticeText
  readonly isMigrating: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onMigrate: () => void
  readonly onCopyCommand: (command: string) => void
}

const MigrationNotice = ({ notice, isMigrating, errorMessage, onTroubleshoot, onMigrate, onCopyCommand }: MigrationNoticeProps) => (
  <TerminusHeading heading={notice.heading} message={notice.message}>
    <div className="flex max-w-[62ch] flex-col items-start gap-3 pt-4">
      <Button disabled={isMigrating} onClick={onMigrate}>{notice.actionLabel}</Button>
      {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} className="text-destructive" />}
      {notice.updateCommand === null
        ? null
        : (
            <div className="flex w-full items-center gap-2 rounded-sm bg-muted py-1 pr-1 pl-3">
              <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] leading-5 select-all">
                <code>{notice.updateCommand}</code>
              </pre>
              <IconButton
                icon="copy"
                label={notice.copyLabel}
                actionId="copy-update-command"
                onClick={() => { if (notice.updateCommand !== null) onCopyCommand(notice.updateCommand) }}
              />
            </div>
          )}
    </div>
  </TerminusHeading>
)

export default MigrationNotice
