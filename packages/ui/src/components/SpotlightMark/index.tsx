import { cn } from "@/lib/utils"

export interface Spotlight {
  readonly label: string
  readonly classifications: readonly { readonly key: string, readonly label: string }[]
}

interface SpotlightMarkProps {
  readonly className?: string
}

interface SpotlightChipProps {
  readonly spotlight: Spotlight
  readonly className?: string
}

const SEPARATOR_CLASSES = "not-last:after:ml-1 not-last:after:font-normal not-last:after:text-muted-foreground not-last:after:content-['•']"

const SpotlightMark = ({ className }: SpotlightMarkProps) => (
  <svg aria-hidden="true" viewBox="0 0 14 14" data-kind="spotlight" className={cn("size-3.5 shrink-0 text-foreground", className)}>
    <circle cx="7" cy="7" r="5" className="fill-none stroke-current stroke-[1.75]" />
    <circle cx="7" cy="7" r="2" className="fill-current" />
  </svg>
)

export const SpotlightChip = ({ spotlight, className }: SpotlightChipProps) => (
  <span className={cn("inline-flex min-w-0 shrink-0 items-center gap-1 text-xs font-bold text-foreground", className)}>
    <SpotlightMark />
    <span className="flex flex-wrap gap-x-1 text-box-cap">
      <span className={SEPARATOR_CLASSES}>{spotlight.label}</span>
      {spotlight.classifications.map((classification) => (
        <span key={classification.key} className={cn("font-normal text-muted-foreground", SEPARATOR_CLASSES)}>{classification.label}</span>
      ))}
    </span>
  </span>
)

export default SpotlightMark
