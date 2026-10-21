import IconButton from "@/components/IconButton"
import OutwardLink from "@/components/OutwardLink"

export interface UpdateToastNotice {
  readonly title: string
  readonly description: string
  readonly command: string
  readonly copyLabel: string
  readonly copiedLabel: string
  readonly releaseNotesLabel: string
  readonly releaseNotesUrl: string
  readonly closeLabel: string
}

interface UpdateToastProps {
  readonly notice: UpdateToastNotice
  readonly isCopied: boolean
  readonly onCopy: () => void
  readonly onClose: () => void
}

const UpdateToast = ({ notice, isCopied, onCopy, onClose }: UpdateToastProps) => (
  <section
    role="status"
    aria-label={notice.title}
    className="fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 rounded-lg border border-foreground bg-popover p-3 text-sm text-popover-foreground duration-150 animate-in fade-in-0"
  >
    <div className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-bold">{notice.title}</p>
        <p className="text-muted-foreground">{notice.description}</p>
      </div>
      <IconButton icon="close" label={notice.closeLabel} actionId="close-update-toast" onClick={onClose} />
    </div>
    <div className="flex items-center gap-2 rounded-sm bg-muted py-1 pr-1 pl-3">
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] leading-5 select-all">
        <code>{notice.command}</code>
      </pre>
      <IconButton
        icon={isCopied ? "copied" : "copy"}
        label={isCopied ? notice.copiedLabel : notice.copyLabel}
        actionId="copy-update-command"
        onClick={onCopy}
      />
    </div>
    <OutwardLink href={notice.releaseNotesUrl} label={notice.releaseNotesLabel} className="self-start" />
  </section>
)

export default UpdateToast
