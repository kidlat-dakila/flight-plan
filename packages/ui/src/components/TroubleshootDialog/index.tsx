import { LoaderCircleIcon } from "lucide-react"
import { useId, useState } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import BusyLabel from "@/components/BusyLabel"
import IconButton from "@/components/IconButton"
import { submitHandlerOf } from "@/lib/form-submit"

export interface TroubleshootDialogContent {
  readonly title: string
  readonly intro: string
  readonly error: { readonly label: string, readonly message: string } | null
  readonly description: { readonly label: string, readonly placeholder: string, readonly isRequired: boolean }
  readonly privacyNote: string
  readonly problem: string | null
  readonly launchLabel: string
  readonly cancelLabel: string
  readonly closeLabel: string
  readonly manual: { readonly label: string, readonly copyLabel: string, readonly copiedMessage: string }
}

export type TroubleshootOutcome
  = | { readonly kind: "opened", readonly message: string }
    | { readonly kind: "manual", readonly message: string, readonly command: string }
    | { readonly kind: "rejected", readonly message: string, readonly field: "description" | null }

export interface TroubleshootDialogProps {
  readonly content: TroubleshootDialogContent | null
  readonly loadProblem: string | null
  readonly outcome: TroubleshootOutcome | null
  readonly isLaunching: boolean
  readonly isCopied: boolean
  readonly onLaunch: (description: string) => void
  readonly onCopy: (command: string) => void
  readonly onClose: () => void
}

interface TroubleshootFormProps {
  readonly content: TroubleshootDialogContent
  readonly outcome: TroubleshootOutcome | null
  readonly isLaunching: boolean
  readonly isCopied: boolean
  readonly onLaunch: (description: string) => void
  readonly onCopy: (command: string) => void
  readonly onClose: () => void
}

interface ManualCommandProps {
  readonly manual: TroubleshootDialogContent["manual"]
  readonly message: string
  readonly command: string
  readonly isCopied: boolean
  readonly onCopy: (command: string) => void
}

const LOADING_LABEL = "Loading"
const COPY_ACTION_ID = "copy-troubleshoot-command"
const TEXTAREA_CLASSES = "min-h-20 w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

const ManualCommand = ({ manual, message, command, isCopied, onCopy }: ManualCommandProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid gap-2 border-t border-border pt-4">
      <p className="text-muted-foreground">{message}</p>
      <h3 id={headingId} className="font-bold">{manual.label}</h3>
      <div className="flex items-center gap-2 rounded-sm bg-muted py-1 pr-1 pl-3">
        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] leading-5 select-all">
          <code>{command}</code>
        </pre>
        <IconButton
          icon={isCopied ? "copied" : "copy"}
          label={isCopied ? manual.copiedMessage : manual.copyLabel}
          actionId={COPY_ACTION_ID}
          onClick={() => { onCopy(command) }}
        />
      </div>
    </section>
  )
}

const TroubleshootForm = ({ content, outcome, isLaunching, isCopied, onLaunch, onCopy, onClose }: TroubleshootFormProps) => {
  const descriptionId = useId()
  const problemId = useId()
  const [description, setDescription] = useState("")
  const isDescriptionRejected = outcome?.kind === "rejected" && outcome.field === "description"
  const isStarted = outcome?.kind === "opened" || outcome?.kind === "manual"
  return (
    <form onSubmit={submitHandlerOf(() => { onLaunch(description) })} className="grid gap-4">
      {content.error === null
        ? null
        : (
            <section aria-label={content.error.label} className="grid gap-1.5">
              <h3 className="text-sm font-bold">{content.error.label}</h3>
              <p className="max-h-32 overflow-y-auto rounded-sm bg-muted px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap">{content.error.message}</p>
            </section>
          )}
      <div className="grid gap-1.5">
        <label htmlFor={descriptionId} className="text-sm font-bold">{content.description.label}</label>
        <textarea
          id={descriptionId}
          value={description}
          placeholder={content.description.placeholder}
          required={content.description.isRequired}
          readOnly={isStarted}
          aria-invalid={isDescriptionRejected}
          aria-describedby={isDescriptionRejected ? problemId : undefined}
          className={TEXTAREA_CLASSES}
          onChange={(event) => { setDescription(event.target.value) }}
        />
        {isDescriptionRejected ? <p id={problemId} role="alert" className="text-sm text-destructive">{outcome.message}</p> : null}
      </div>
      <p className="text-sm text-muted-foreground">{content.privacyNote}</p>
      {content.problem === null ? null : <p role="alert" className="text-sm text-destructive">{content.problem}</p>}
      {outcome?.kind === "rejected" && outcome.field === null ? <p role="alert" className="text-sm text-destructive">{outcome.message}</p> : null}
      {outcome?.kind === "opened" ? <p role="status" className="font-bold">{outcome.message}</p> : null}
      {outcome?.kind === "manual"
        ? <ManualCommand manual={content.manual} message={outcome.message} command={outcome.command} isCopied={isCopied} onCopy={onCopy} />
        : null}
      <DialogFooter>
        {isStarted
          ? <Button type="button" onClick={onClose}>{content.closeLabel}</Button>
          : (
              <>
                <Button type="button" variant="ghost" onClick={onClose}>{content.cancelLabel}</Button>
                <Button type="submit" disabled={isLaunching || content.problem !== null} aria-busy={isLaunching}>
                  {isLaunching ? <LoaderCircleIcon aria-hidden="true" className="motion-safe:animate-spin" /> : null}
                  {content.launchLabel}
                </Button>
              </>
            )}
      </DialogFooter>
    </form>
  )
}

const DialogLoading = ({ loadProblem }: { readonly loadProblem: string | null }) =>
  loadProblem === null ? <BusyLabel label={LOADING_LABEL} /> : <p role="alert" className="text-destructive">{loadProblem}</p>

const TroubleshootDialog = ({ content, loadProblem, outcome, isLaunching, isCopied, onLaunch, onCopy, onClose }: TroubleshootDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{content?.title ?? LOADING_LABEL}</DialogTitle>
        {content === null ? null : <DialogDescription>{content.intro}</DialogDescription>}
      </DialogHeader>
      {content === null
        ? <DialogLoading loadProblem={loadProblem} />
        : (
            <TroubleshootForm
              content={content}
              outcome={outcome}
              isLaunching={isLaunching}
              isCopied={isCopied}
              onLaunch={onLaunch}
              onCopy={onCopy}
              onClose={onClose}
            />
          )}
    </DialogContent>
  </Dialog>
)

export default TroubleshootDialog
