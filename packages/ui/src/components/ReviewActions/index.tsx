import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { ChevronDownIcon, CircleCheckIcon, DownloadIcon, EllipsisVerticalIcon, ExternalLinkIcon, LoaderCircleIcon, MessagesSquareIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/blocks/dropdown-menu"
import type { CommentEditorRenderer } from "@/components/CommentThread"
import OutwardLink from "@/components/OutwardLink"
import { cn } from "@/lib/utils"

type ReviewVerdict = "comment" | "approve" | "request-changes"
export type PublicationKind = "description" | "claude"

interface Link {
  readonly href: string
  readonly label: string
}

export interface ReviewDraft {
  readonly isAvailable: boolean
  readonly unavailableReason: string | null
  readonly buttonLabel: string
  readonly heading: string
  readonly pendingLabel: string
  readonly pendingComments: readonly {
    readonly id: string
    readonly locationLabel: string
    readonly excerpt: string
    readonly staleLabel: string | null
    readonly discardLabel: string
  }[]
  readonly bodyPlaceholder: string
  readonly submitLabel: string
  readonly verdicts: readonly { readonly key: ReviewVerdict, readonly label: string, readonly description: string }[]
}

export interface Sharing {
  readonly buttonLabel: string
  readonly options: readonly {
    readonly key: PublicationKind
    readonly label: string
    readonly description: string
    readonly actionLabel: string
    readonly pendingLabel: string
    readonly isPending: boolean
    readonly isAvailable: boolean
    readonly statusLabel: string | null
    readonly link: { readonly href: string, readonly label: string } | null
  }[]
}

interface BandButtonProps {
  readonly label: string
  readonly isPressed: boolean
  readonly onClick: () => void
}

interface BandMenuButtonProps {
  readonly label: string
  readonly actionId: string
  readonly isPrimary?: boolean
  readonly onClick: () => void
}

interface BandLinkProps {
  readonly href: string
  readonly label: string
}

interface CompleteButtonProps {
  readonly label: string
  readonly isPending: boolean
  readonly onClick: () => void
}

interface BandHintProps {
  readonly label: string
  readonly onClick: () => void
}

interface SubmitReviewMenuProps {
  readonly draft: ReviewDraft
  readonly isSubmitting: boolean
  readonly isDiscarding: boolean
  readonly errorMessage: string | null
  readonly submissionCount: number
  readonly renderEditor: CommentEditorRenderer
  readonly onSubmit: (verdict: ReviewVerdict, body: string) => void
  readonly onDiscard: (commentId: string) => void
}

interface ShareMenuProps {
  readonly sharing: Sharing
  readonly publishingKey: PublicationKind | null
  readonly onPublish: (destination: PublicationKind) => void
}

interface OptionsMenuProps {
  readonly forgeLink: Link | null
  readonly onDelete: () => void
}

const BAND_BUTTON_CLASSES = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-sign-foreground/35 px-2.5 text-[0.8rem] text-sign-foreground hover:bg-sign-foreground/10 aria-expanded:bg-sign-foreground/15 aria-pressed:bg-sign-foreground aria-pressed:text-sign disabled:opacity-50"
const PRIMARY_BAND_BUTTON_CLASSES = "border-primary bg-primary font-bold text-primary-foreground hover:bg-primary/85 aria-expanded:bg-primary/85"
export const PANEL_CLASSES = "z-50 flex w-96 origin-(--transform-origin) flex-col gap-3 rounded-lg border border-foreground bg-popover p-4 text-sm text-popover-foreground outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
const WIDE_PANEL_CLASSES = "max-h-[min(44rem,calc(100vh-5rem))] w-[34rem] overflow-y-auto"
const DISCARD_BUTTON_CLASSES = "shrink-0 text-xs text-muted-foreground underline decoration-1 underline-offset-[0.3em] hover:text-foreground disabled:opacity-50"

interface BandPopoverProps {
  readonly trigger: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly onOpen?: () => void
}

export const BandPopover = ({ trigger, children, className, onOpen }: BandPopoverProps) => (
  <PopoverPrimitive.Root
    onOpenChange={(isOpen) => {
      if (isOpen) onOpen?.()
    }}
  >
    {trigger}
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align="end" sideOffset={10} className="isolate z-50">
        <PopoverPrimitive.Popup className={cn(PANEL_CLASSES, className)}>{children}</PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>
)

export const BandButton = ({ label, isPressed, onClick }: BandButtonProps) => (
  <button type="button" aria-pressed={isPressed} data-user-action-id="chat-action" className={BAND_BUTTON_CLASSES} onClick={onClick}>
    <MessagesSquareIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </button>
)

export const BandMenuButton = ({ label, actionId, isPrimary = false, onClick }: BandMenuButtonProps) => (
  <button type="button" data-user-action-id={actionId} className={cn(BAND_BUTTON_CLASSES, isPrimary ? PRIMARY_BAND_BUTTON_CLASSES : "")} onClick={onClick}>
    <span className="text-box-cap">{label}</span>
    <ChevronDownIcon aria-hidden="true" className="size-3.5" />
  </button>
)

export const BandLink = ({ href, label }: BandLinkProps) => (
  <a href={href} target="_blank" rel="noreferrer" data-user-action-id="download-flight-plan-action" className={BAND_BUTTON_CLASSES}>
    <DownloadIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </a>
)

export const CompleteButton = ({ label, isPending, onClick }: CompleteButtonProps) => (
  <button type="button" disabled={isPending} data-user-action-id="complete-review-action" className={BAND_BUTTON_CLASSES} onClick={onClick}>
    <CircleCheckIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </button>
)

export const BandHint = ({ label, onClick }: BandHintProps) => (
  <button type="button" data-user-action-id="unassigned-files-action" className={cn(BAND_BUTTON_CLASSES, "font-bold text-signal")} onClick={onClick}>
    <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </button>
)

export const OptionsMenu = ({ forgeLink, onDelete }: OptionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger aria-label="More actions" data-user-action-id="options-menu-action" className={cn(BAND_BUTTON_CLASSES, "px-1.5")}>
      <EllipsisVerticalIcon aria-hidden="true" className="size-3.5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {forgeLink === null
        ? null
        : (
            <DropdownMenuItem render={<a href={forgeLink.href} target="_blank" rel="noreferrer" aria-label={forgeLink.label} />}>
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
              {forgeLink.label}
            </DropdownMenuItem>
          )}
      {forgeLink === null ? null : <DropdownMenuSeparator />}
      <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={onDelete}>
        <Trash2Icon aria-hidden="true" className="size-3.5" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export const SubmitReviewMenu = ({
  draft,
  isSubmitting,
  isDiscarding,
  errorMessage,
  submissionCount,
  renderEditor,
  onSubmit,
  onDiscard,
}: SubmitReviewMenuProps) => {
  const groupId = useId()
  const [body, setBody] = useState("")
  const [chosenVerdict, setChosenVerdict] = useState<ReviewVerdict | null>(null)
  const offeredVerdicts = draft.verdicts.map((option) => option.key)
  const verdict = offeredVerdicts.find((key) => key === chosenVerdict) ?? offeredVerdicts.at(0) ?? null
  if (!draft.isAvailable || verdict === null) {
    return (
      <button type="button" disabled title={draft.unavailableReason ?? undefined} className={BAND_BUTTON_CLASSES}>
        <span className="text-box-cap">{draft.buttonLabel}</span>
      </button>
    )
  }
  return (
    <BandPopover
      className={WIDE_PANEL_CLASSES}
      trigger={(
        <PopoverPrimitive.Trigger data-user-action-id="submit-review-action" className={cn(BAND_BUTTON_CLASSES, PRIMARY_BAND_BUTTON_CLASSES)}>
          <span className="text-box-cap">{draft.buttonLabel}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5" />
        </PopoverPrimitive.Trigger>
      )}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(verdict, body.trim())
        }}
      >
        <PopoverPrimitive.Title className="text-base leading-6 font-bold">{draft.heading}</PopoverPrimitive.Title>
        <div key={submissionCount}>{renderEditor({ label: draft.bodyPlaceholder, shouldFocus: false, onChange: setBody })}</div>
        <fieldset className="flex flex-col gap-2">
          {draft.verdicts.map((option) => (
            <label key={option.key} className="grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2">
              <input
                type="radio"
                name={groupId}
                checked={verdict === option.key}
                className="mt-1 size-3.5 accent-(--primary)"
                onChange={() => { setChosenVerdict(option.key) }}
              />
              <span className="font-bold">{option.label}</span>
              <span className="col-start-2 text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-muted-foreground tabular-nums">{draft.pendingLabel}</p>
        {draft.pendingComments.length === 0
          ? null
          : (
              <ul className="flex flex-col">
                {draft.pendingComments.map((pending) => (
                  <li key={pending.id} className="flex items-start justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-xs text-muted-foreground wrap-anywhere">{pending.locationLabel}</span>
                      <span className="truncate">{pending.excerpt}</span>
                      {pending.staleLabel === null ? null : <span className="text-destructive">{pending.staleLabel}</span>}
                    </div>
                    <button
                      type="button"
                      aria-label={`${pending.discardLabel}: ${pending.locationLabel}`}
                      disabled={isDiscarding}
                      className={DISCARD_BUTTON_CLASSES}
                      onClick={() => { onDiscard(pending.id) }}
                    >
                      {pending.discardLabel}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        {errorMessage === null ? null : <p role="alert" className="text-destructive">{errorMessage}</p>}
        <Button type="submit" disabled={isSubmitting} className="self-end">{draft.submitLabel}</Button>
      </form>
    </BandPopover>
  )
}

const SPINNER_CLASSES = "size-3.5 motion-safe:animate-spin"

export const ShareMenu = ({ sharing, publishingKey, onPublish }: ShareMenuProps) => {
  const isUnderway = (option: Sharing["options"][number]): boolean => option.isPending || option.key === publishingKey
  const isAnyUnderway = sharing.options.some(isUnderway)
  return (
    <BandPopover
      trigger={(
        <PopoverPrimitive.Trigger aria-busy={isAnyUnderway} data-user-action-id="share-action" className={BAND_BUTTON_CLASSES}>
          <span className="text-box-cap">{sharing.buttonLabel}</span>
          {isAnyUnderway
            ? <LoaderCircleIcon aria-hidden="true" className={SPINNER_CLASSES} />
            : <ChevronDownIcon aria-hidden="true" className="size-3.5" />}
        </PopoverPrimitive.Trigger>
      )}
    >
      <ul className="flex flex-col">
        {sharing.options.map((option) => (
          <li key={option.key} className="flex flex-col gap-1.5 border-t py-3 first:border-t-0 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{option.label}</p>
              <Button
                variant="outline"
                size="sm"
                aria-busy={isUnderway(option)}
                disabled={!option.isAvailable || isAnyUnderway}
                onClick={() => { onPublish(option.key) }}
              >
                {isUnderway(option) ? <LoaderCircleIcon aria-hidden="true" className={SPINNER_CLASSES} /> : null}
                {isUnderway(option) ? option.pendingLabel : option.actionLabel}
              </Button>
            </div>
            <p className="text-muted-foreground">{option.description}</p>
            {option.statusLabel === null || option.link === null
              ? null
              : (
                  <p className="flex flex-wrap items-center gap-x-3 tabular-nums">
                    {option.statusLabel}
                    <OutwardLink href={option.link.href} label={option.link.label} />
                  </p>
                )}
          </li>
        ))}
      </ul>
    </BandPopover>
  )
}

export default SubmitReviewMenu
