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

interface DraftingNotice {
  readonly label: string
  readonly message: string
}

interface ReviewNoticesProps {
  readonly staleNotice: StaleNotice | null
  readonly draftingNotice: DraftingNotice | null
  readonly onCopyPrompt: (prompt: string, copiedMessage: string) => void
}

const NO_CODE_LINKS = {}

const ignoreCodeLink = (): void => undefined

const NOTICE_ROW_CLASSES = "flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 text-sm"

const ReviewNotices = ({ staleNotice, draftingNotice, onCopyPrompt }: ReviewNoticesProps) => (
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
    {draftingNotice === null
      ? null
      : (
          <div role="status" className={NOTICE_ROW_CLASSES}>
            <StopRing status="awaiting-review" className="motion-safe:animate-pulse" />
            <p className="font-bold text-signal-text">{draftingNotice.label}</p>
            <p className="text-muted-foreground">{draftingNotice.message}</p>
          </div>
        )}
  </div>
)

export default ReviewNotices
