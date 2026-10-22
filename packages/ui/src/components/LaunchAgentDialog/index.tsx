import { LoaderCircleIcon } from "lucide-react"
import { useId } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import IconButton from "@/components/IconButton"

export interface LaunchAgentTerminalOption {
  readonly label: string
  readonly description: string
}

export interface LaunchAgentManualOption {
  readonly label: string
  readonly description: string
  readonly prompt: string
  readonly copyLabel: string
  readonly copiedMessage: string
}

export interface LaunchAgentDialogContent {
  readonly title: string
  readonly description: string
  readonly terminal: LaunchAgentTerminalOption | null
  readonly manual: LaunchAgentManualOption
  readonly closeLabel: string
}

export interface LaunchAgentDialogProps {
  readonly content: LaunchAgentDialogContent
  readonly isOpening: boolean
  readonly problem: string | null
  readonly onOpenTerminal: () => void
  readonly onCopy: (text: string, copiedMessage: string) => void
  readonly onClose: () => void
}

interface TerminalOptionProps {
  readonly option: LaunchAgentTerminalOption
  readonly isOpening: boolean
  readonly problem: string | null
  readonly onOpenTerminal: () => void
}

interface ManualOptionProps {
  readonly option: LaunchAgentManualOption
  readonly onCopy: (text: string, copiedMessage: string) => void
}

const OPTION_CLASSES = "grid gap-2 border-t border-border pt-4"
const OPTION_DESCRIPTION_CLASSES = "text-muted-foreground"
const COPY_ACTION_ID = "copy-launch-agent-prompt"

const TerminalOption = ({ option, isOpening, problem, onOpenTerminal }: TerminalOptionProps) => (
  <section aria-label={option.label} className={OPTION_CLASSES}>
    <Button type="button" className="justify-self-start" disabled={isOpening} aria-busy={isOpening} onClick={onOpenTerminal}>
      {isOpening ? <LoaderCircleIcon aria-hidden="true" className="motion-safe:animate-spin" /> : null}
      {option.label}
    </Button>
    <p className={OPTION_DESCRIPTION_CLASSES}>{option.description}</p>
    {problem === null ? null : <p role="alert" className="text-destructive">{problem}</p>}
  </section>
)

const ManualOption = ({ option, onCopy }: ManualOptionProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={OPTION_CLASSES}>
      <h3 id={headingId} className="font-bold">{option.label}</h3>
      <p className={OPTION_DESCRIPTION_CLASSES}>{option.description}</p>
      <div className="flex items-center gap-2 rounded-sm bg-muted py-1 pr-1 pl-3">
        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] leading-5 select-all">
          <code>{option.prompt}</code>
        </pre>
        <IconButton
          icon="copy"
          label={option.copyLabel}
          actionId={COPY_ACTION_ID}
          onClick={() => { onCopy(option.prompt, option.copiedMessage) }}
        />
      </div>
    </section>
  )
}

const LaunchAgentDialog = ({ content, isOpening, problem, onOpenTerminal, onCopy, onClose }: LaunchAgentDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{content.title}</DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
      </DialogHeader>
      {content.terminal === null
        ? null
        : <TerminalOption option={content.terminal} isOpening={isOpening} problem={problem} onOpenTerminal={onOpenTerminal} />}
      <ManualOption option={content.manual} onCopy={onCopy} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>{content.closeLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default LaunchAgentDialog
