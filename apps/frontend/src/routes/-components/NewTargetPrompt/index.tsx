import Avatar from "@flightplan/ui/Avatar"
import Button, { buttonVariants } from "@flightplan/ui/blocks/button"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"

interface NewTargetPromptProps {
  readonly kindLabel: string
  readonly title: LabelSegment
  readonly details: readonly LabelSegment[]
  readonly author: { readonly name: string, readonly avatarUrl: string | null, readonly monogram: string } | null
  readonly updatedLabel: string
  readonly createReviewHref: string
  readonly isDismissing: boolean
  readonly onDismiss: () => void
}

const NewTargetPrompt = ({
  kindLabel,
  title,
  details,
  author,
  updatedLabel,
  createReviewHref,
  isDismissing,
  onDismiss,
}: NewTargetPromptProps) => (
  <li className="grid grid-cols-[2.5rem_minmax(0,1fr)]">
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="w-1 flex-1 bg-(--line)" />
    </span>
    <div className="my-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm bg-muted px-3 py-2">
      <div className="min-w-0 flex-1 basis-72">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-bold">{kindLabel}</span>
          <span className="text-muted-foreground tabular-nums">{updatedLabel}</span>
        </p>
        <LabelSegments segments={[title]} className="leading-6" />
        <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <LabelSegments segments={details} />
          {author === null
            ? null
            : (
                <span className="flex items-center gap-1.5">
                  <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} className="size-4" />
                  {author.name}
                </span>
              )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a href={createReviewHref} className={buttonVariants({ variant: "default", size: "sm" })}>
          <span className="text-box-cap">Create Flight Plan</span>
        </a>
        <Button variant="ghost" size="sm" disabled={isDismissing} onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  </li>
)

export default NewTargetPrompt
