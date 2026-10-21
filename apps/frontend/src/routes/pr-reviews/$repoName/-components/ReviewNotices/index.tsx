import Button from "@flightplan/ui/blocks/button"
import { PINNED_ROW_PROPS } from "@flightplan/ui/lib/pinned-rows"
import type { Inline } from "@flightplan/ui/lib/review-content"
import { Inlines } from "@flightplan/ui/Prose"
import StopRing from "@flightplan/ui/StopRing"

interface StaleNotice {
  readonly message: readonly Inline[]
  readonly promptLabel: string
  readonly prompt: string
  readonly copiedMessage: string
}

interface ReviewProgress {
  readonly label: string
  readonly message: string
  readonly isWriting: boolean
  readonly countLabel: string
  readonly writtenCount: number
  readonly totalCount: number
  readonly prompt: { readonly label: string, readonly text: string, readonly copiedMessage: string } | null
}

interface UnassignedFilesNotice {
  readonly message: string
  readonly actionLabel: string
}

interface ReviewNoticesProps {
  readonly staleNotice: StaleNotice | null
  readonly unassignedFiles: UnassignedFilesNotice | null
  readonly progress: ReviewProgress | null
  readonly onShowUnassignedFiles: () => void
  readonly onCopyPrompt: (prompt: string, copiedMessage: string) => void
}

const NO_CODE_LINKS = {}

const ignoreCodeLink = (): void => undefined

const NOTICE_ROW_CLASSES = "flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 text-sm"
const DRAFTING_STRIP_CLASSES = "sticky top-(--band-height) z-20 flex h-(--strip-height) items-center gap-3 border-b bg-background text-sm whitespace-nowrap"

const ReviewNotices = ({ staleNotice, unassignedFiles, progress, onShowUnassignedFiles, onCopyPrompt }: ReviewNoticesProps) => (
  <>
    {staleNotice === null
      ? null
      : (
          <div role="status" className={NOTICE_ROW_CLASSES}>
            <StopRing status="stale" tone="signal" />
            <p className="font-bold text-signal-text [&_code]:bg-transparent [&_code]:px-0">
              <Inlines inlines={staleNotice.message} codeLinks={NO_CODE_LINKS} onOpenCodeLink={ignoreCodeLink} />
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onCopyPrompt(staleNotice.prompt, staleNotice.copiedMessage) }}
            >
              {staleNotice.promptLabel}
            </Button>
          </div>
        )}
    {unassignedFiles === null
      ? null
      : (
          <div role="status" className={NOTICE_ROW_CLASSES}>
            <StopRing status="stale" tone="signal" />
            <p className="font-bold text-signal-text">{unassignedFiles.message}</p>
            <Button variant="outline" size="sm" onClick={onShowUnassignedFiles}>{unassignedFiles.actionLabel}</Button>
          </div>
        )}
    {progress === null
      ? null
      : (
          <div role="status" {...PINNED_ROW_PROPS} className={DRAFTING_STRIP_CLASSES}>
            <StopRing
              status={progress.isWriting ? "awaiting-review" : "stale"}
              tone={progress.isWriting ? "status" : "signal"}
              className={progress.isWriting ? "motion-safe:animate-pulse" : ""}
            />
            <p className="font-bold text-signal-text">{progress.label}</p>
            <progress
              aria-label={progress.countLabel}
              value={progress.writtenCount}
              max={progress.totalCount}
              className="h-1.5 w-40 shrink-0 appearance-none overflow-hidden rounded-[0.225rem] bg-muted [&::-moz-progress-bar]:bg-signal [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-signal [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300"
            />
            <p className="text-foreground tabular-nums">{progress.countLabel}</p>
            <p className="min-w-0 truncate text-muted-foreground">{progress.message}</p>
            {progress.prompt === null
              ? null
              : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (progress.prompt !== null) onCopyPrompt(progress.prompt.text, progress.prompt.copiedMessage)
                    }}
                  >
                    {progress.prompt.label}
                  </Button>
                )}
          </div>
        )}
  </>
)

export default ReviewNotices
