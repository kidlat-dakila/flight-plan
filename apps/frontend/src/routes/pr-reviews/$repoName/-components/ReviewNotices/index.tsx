import Button from "@flightplan/ui/blocks/button"
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

interface ReviewNoticesProps {
  readonly staleNotice: StaleNotice | null
  readonly progress: ReviewProgress | null
  readonly onCopyPrompt: (prompt: string, copiedMessage: string) => void
}

const NO_CODE_LINKS = {}

const ignoreCodeLink = (): void => undefined

const NOTICE_ROW_CLASSES = "flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 text-sm"

const ReviewNotices = ({ staleNotice, progress, onCopyPrompt }: ReviewNoticesProps) => (
  <div>
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
    {progress === null
      ? null
      : (
          <div role="status" className={NOTICE_ROW_CLASSES}>
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
              className="h-1.5 w-40 appearance-none overflow-hidden rounded-[0.225rem] bg-muted [&::-moz-progress-bar]:bg-signal [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-signal [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300"
            />
            <p className="text-foreground tabular-nums">{progress.countLabel}</p>
            <p className="text-muted-foreground">{progress.message}</p>
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
  </div>
)

export default ReviewNotices
