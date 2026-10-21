import { use, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { WritingContext } from "@/lib/writing-context"

interface SkeletonLinesProps {
  readonly label: string
  readonly lineCount?: number
  readonly className?: string
  readonly caption?: ReactNode
}

interface UnwrittenProps extends Omit<SkeletonLinesProps, "label"> {
  readonly isPending: boolean
  readonly children: ReactNode
}

const BAR_CLASSES = "block h-[0.7em] rounded-[0.225rem] bg-foreground/10 motion-safe:animate-pulse"
const LAST_LINE_CLASSES = "w-3/5"

export const SkeletonLines = ({ label, lineCount = 1, className, caption = null }: SkeletonLinesProps) => {
  const lines = Array.from({ length: lineCount }, (_unused, position) => position)
  return (
    <span data-unwritten="true" className={cn("flex min-w-0 flex-col justify-center gap-[0.6em] py-[0.3em]", className)}>
      <span className="sr-only">{label}</span>
      {lines.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={cn(BAR_CLASSES, lineCount > 1 && position === lineCount - 1 ? LAST_LINE_CLASSES : "")}
        />
      ))}
      {caption}
    </span>
  )
}

const Unwritten = ({ isPending, lineCount, className, caption, children }: UnwrittenProps) => {
  const writingLabel = use(WritingContext)
  if (!isPending || writingLabel === null) return <>{children}</>
  return <SkeletonLines label={writingLabel} lineCount={lineCount} className={className} caption={caption} />
}

export default Unwritten
