import { CircleDashedIcon } from "lucide-react"
import type { ReactNode } from "react"
import Button from "@/components/blocks/button"
import { SkeletonLines } from "@/components/Unwritten"
import { WRITE_UP_KEY } from "@/lib/navigator-controls"
import { cn } from "@/lib/utils"

interface WriteUpIconProps {
  readonly className?: string
}

interface NoWriteUpTagProps {
  readonly label: string
  readonly className?: string
}

interface KeycapButtonProps {
  readonly label: string
  readonly keyLabel: string | null
  readonly icon?: ReactNode
  readonly variant?: "outline" | "ghost"
  readonly actionId: string
  readonly onClick: () => void
}

interface WriteUpOfferProps {
  readonly hint: string | null
  readonly label: string
  readonly isBeingWritten: boolean
  readonly buttonLabel: string
  readonly onWriteUp: (() => void) | null
}

const BEING_WRITTEN_LINE_COUNT = 3

const WriteUpIcon = ({ className }: WriteUpIconProps) => (
  <CircleDashedIcon aria-hidden="true" className={cn("size-3.5 shrink-0 text-muted-foreground", className)} />
)

export const NoWriteUpTag = ({ label, className }: NoWriteUpTagProps) => (
  <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
    <WriteUpIcon />
    {label}
  </span>
)

export const KeycapButton = ({ label, keyLabel, icon = null, variant = "outline", actionId, onClick }: KeycapButtonProps) => (
  <Button type="button" variant={variant} size="xs" data-user-action-id={actionId} onClick={onClick}>
    {icon}
    {label}
    {keyLabel === null
      ? null
      : (
          <kbd aria-hidden="true" className="inline-grid h-4 min-w-4 place-items-center rounded-sm border border-b-2 border-current/35 px-1 font-mono text-[0.625rem] leading-none font-bold uppercase opacity-80">
            {keyLabel}
          </kbd>
        )}
  </Button>
)

export const BeingWrittenLines = ({ label }: { readonly label: string }) => (
  <SkeletonLines label={label} lineCount={BEING_WRITTEN_LINE_COUNT} className="text-sm" />
)

export const WriteUpOffer = ({ hint, label, isBeingWritten, buttonLabel, onWriteUp }: WriteUpOfferProps) => (
  <div className="flex flex-col gap-2">
    {hint === null ? null : <p className="text-foreground">{hint}</p>}
    {isBeingWritten
      ? <BeingWrittenLines label={label} />
      : (
          <>
            <NoWriteUpTag label={label} />
            {onWriteUp === null ? null : <div><KeycapButton label={buttonLabel} keyLabel={WRITE_UP_KEY} actionId="explain-part-action" onClick={onWriteUp} /></div>}
          </>
        )}
  </div>
)

export default WriteUpIcon
