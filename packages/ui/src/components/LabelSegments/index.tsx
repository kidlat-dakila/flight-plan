import { cn } from "@/lib/utils"

export interface LabelSegment {
  readonly text: string
  readonly kind: "plain" | "code"
}

interface LabelSegmentsProps {
  readonly segments: readonly LabelSegment[]
  readonly className?: string
}

const SEGMENT_CLASSES: Record<LabelSegment["kind"], string> = {
  plain: "",
  code: "font-mono text-[0.94em]",
}

const SEPARATOR_CLASSES = "not-last:after:ml-[0.5em] not-last:after:font-sans not-last:after:content-['•']"

const LabelSegments = ({ segments, className }: LabelSegmentsProps) => (
  <span className={cn("flex flex-wrap gap-x-[0.5em]", className)}>
    {segments.map((segment) => (
      <span
        key={`${segment.kind}:${segment.text}`}
        className={cn("min-w-0 wrap-anywhere", SEPARATOR_CLASSES, SEGMENT_CLASSES[segment.kind])}
      >
        {segment.text}
      </span>
    ))}
  </span>
)

export default LabelSegments
