import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { ChevronDownIcon, EllipsisVerticalIcon, ExternalLinkIcon, MessagesSquareIcon, RefreshCwIcon, SparklesIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/blocks/dropdown-menu"
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

interface BandHintProps {
  readonly label: string
  readonly onClick: () => void
}

interface SubmitReviewMenuProps {
  readonly draft: ReviewDraft
  readonly isSubmitting: boolean
  readonly errorMessage: string | null
  readonly onSubmit: (verdict: ReviewVerdict, body: string) => void
}

interface ShareMenuProps {
  readonly sharing: Sharing
  readonly isPublishing: boolean
  readonly onPublish: (destination: PublicationKind) => void
}

interface RebuildActions {
  readonly onUpdate: () => void
  readonly onRegenerate: () => void
}

interface OptionsMenuProps {
  readonly forgeLink: Link | null
  readonly rebuild: RebuildActions | null
  readonly onDelete: () => void
}

const BAND_BUTTON_CLASSES = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-sign-foreground/35 px-2.5 text-[0.8rem] text-sign-foreground hover:bg-sign-foreground/10 aria-expanded:bg-sign-foreground/15 aria-pressed:bg-sign-foreground aria-pressed:text-sign disabled:opacity-50"
const PRIMARY_BAND_BUTTON_CLASSES = "border-primary bg-primary font-bold text-primary-foreground hover:bg-primary/85 aria-expanded:bg-primary/85"
const PANEL_CLASSES = "z-50 flex w-96 origin-(--transform-origin) flex-col gap-3 rounded-lg border border-foreground bg-popover p-4 text-sm text-popover-foreground outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
const TEXTAREA_CLASSES = "min-h-20 w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

const BandPopover = ({ trigger, children }: { readonly trigger: ReactNode, readonly children: ReactNode }) => (
  <PopoverPrimitive.Root>
    {trigger}
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align="end" sideOffset={10} className="isolate z-50">
        <PopoverPrimitive.Popup className={PANEL_CLASSES}>{children}</PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>
)

export const BandButton = ({ label, isPressed, onClick }: BandButtonProps) => (
  <button type="button" aria-pressed={isPressed} className={BAND_BUTTON_CLASSES} onClick={onClick}>
    <MessagesSquareIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </button>
)

export const BandHint = ({ label, onClick }: BandHintProps) => (
  <button type="button" className={cn(BAND_BUTTON_CLASSES, "font-bold text-signal")} onClick={onClick}>
    <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
    <span className="text-box-cap">{label}</span>
  </button>
)

export const OptionsMenu = ({ forgeLink, rebuild, onDelete }: OptionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger aria-label="More actions" className={cn(BAND_BUTTON_CLASSES, "px-1.5")}>
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
      {rebuild === null
        ? null
        : (
            <>
              <DropdownMenuItem onClick={rebuild.onUpdate}>
                <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                Update the Flight Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={rebuild.onRegenerate}>
                <SparklesIcon aria-hidden="true" className="size-3.5" />
                Regenerate from scratch
              </DropdownMenuItem>
            </>
          )}
      {forgeLink === null && rebuild === null ? null : <DropdownMenuSeparator />}
      <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={onDelete}>
        <Trash2Icon aria-hidden="true" className="size-3.5" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export const SubmitReviewMenu = ({ draft, isSubmitting, errorMessage, onSubmit }: SubmitReviewMenuProps) => {
  const groupId = useId()
  const [body, setBody] = useState("")
  const [verdict, setVerdict] = useState<ReviewVerdict>("comment")
  if (!draft.isAvailable) {
    return (
      <button type="button" disabled title={draft.unavailableReason ?? undefined} className={BAND_BUTTON_CLASSES}>
        <span className="text-box-cap">{draft.buttonLabel}</span>
      </button>
    )
  }
  return (
    <BandPopover
      trigger={(
        <PopoverPrimitive.Trigger className={cn(BAND_BUTTON_CLASSES, PRIMARY_BAND_BUTTON_CLASSES)}>
          <span className="text-box-cap">{draft.buttonLabel}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5" />
        </PopoverPrimitive.Trigger>
      )}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(verdict, body)
        }}
      >
        <PopoverPrimitive.Title className="text-base leading-6 font-bold">{draft.heading}</PopoverPrimitive.Title>
        <textarea
          aria-label={draft.bodyPlaceholder}
          placeholder={draft.bodyPlaceholder}
          value={body}
          className={TEXTAREA_CLASSES}
          onChange={(event) => { setBody(event.target.value) }}
        />
        <fieldset className="flex flex-col gap-2">
          {draft.verdicts.map((option) => (
            <label key={option.key} className="grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2">
              <input
                type="radio"
                name={groupId}
                checked={verdict === option.key}
                className="mt-1 size-3.5 accent-(--primary)"
                onChange={() => { setVerdict(option.key) }}
              />
              <span className="font-bold">{option.label}</span>
              <span className="col-start-2 text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-muted-foreground tabular-nums">{draft.pendingLabel}</p>
        {errorMessage === null ? null : <p role="alert" className="text-destructive">{errorMessage}</p>}
        <Button type="submit" disabled={isSubmitting} className="self-end">{draft.submitLabel}</Button>
      </form>
    </BandPopover>
  )
}

export const ShareMenu = ({ sharing, isPublishing, onPublish }: ShareMenuProps) => (
  <BandPopover
    trigger={(
      <PopoverPrimitive.Trigger className={BAND_BUTTON_CLASSES}>
        <span className="text-box-cap">{sharing.buttonLabel}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5" />
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
              disabled={!option.isAvailable || isPublishing}
              onClick={() => { onPublish(option.key) }}
            >
              {option.actionLabel}
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

export default SubmitReviewMenu
