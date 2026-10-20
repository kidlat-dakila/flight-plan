import { CircleDashedIcon } from "lucide-react"
import Button from "@/components/blocks/button"
import { WRITE_UP_KEY } from "@/lib/navigator-controls"
import { cn } from "@/lib/utils"

interface WriteUpIconProps {
  readonly isBeingWritten: boolean
  readonly className?: string
}

interface NoWriteUpTagProps {
  readonly label: string
  readonly isBeingWritten?: boolean
  readonly className?: string
}

interface WriteUpButtonProps {
  readonly label: string
  readonly keyLabel: string
  readonly onClick: () => void
}

interface WriteUpOfferProps {
  readonly hint: string | null
  readonly label: string
  readonly isBeingWritten: boolean
  readonly buttonLabel: string
  readonly onWriteUp: (() => void) | null
}

const WriteUpIcon = ({ isBeingWritten, className }: WriteUpIconProps) => (
  <CircleDashedIcon
    aria-hidden="true"
    data-being-written={isBeingWritten}
    className={cn("size-3.5 shrink-0 text-muted-foreground", isBeingWritten ? "motion-safe:animate-spin" : "", className)}
  />
)

export const NoWriteUpTag = ({ label, isBeingWritten = false, className }: NoWriteUpTagProps) => (
  <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
    <WriteUpIcon isBeingWritten={isBeingWritten} />
    {label}
  </span>
)

export const WriteUpButton = ({ label, keyLabel, onClick }: WriteUpButtonProps) => (
  <Button type="button" variant="outline" size="xs" onClick={onClick}>
    {label}
    <kbd aria-hidden="true" className="inline-grid h-4 min-w-4 place-items-center rounded-sm border border-b-2 border-current/35 px-1 font-mono text-[0.625rem] leading-none font-bold uppercase opacity-80">
      {keyLabel}
    </kbd>
  </Button>
)

export const WriteUpOffer = ({ hint, label, isBeingWritten, buttonLabel, onWriteUp }: WriteUpOfferProps) => (
  <div className="flex flex-col gap-2">
    {hint === null ? null : <p className="text-foreground">{hint}</p>}
    <NoWriteUpTag label={label} isBeingWritten={isBeingWritten} />
    {onWriteUp === null || isBeingWritten
      ? null
      : <div><WriteUpButton label={buttonLabel} keyLabel={WRITE_UP_KEY} onClick={onWriteUp} /></div>}
  </div>
)

export default WriteUpIcon
