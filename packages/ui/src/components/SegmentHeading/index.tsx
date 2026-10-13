import type { ReactNode } from "react"

interface SegmentHeadingProps {
  readonly heading: string
  readonly detailLabel: string | null
  readonly children?: ReactNode
}

const SegmentHeading = ({ heading, detailLabel, children = null }: SegmentHeadingProps) => (
  <div className="flex items-baseline gap-3 pt-6">
    <h2 className="text-[1.75rem] leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    {children}
    {detailLabel === null ? null : <p className="text-sm text-muted-foreground tabular-nums">{detailLabel}</p>}
  </div>
)

export default SegmentHeading
