import BlastDiagram, { type BlastBoard } from "@/components/BlastDiagram"
import VerdictMark, { type Verdict } from "@/components/VerdictMark"
import type { CodeLinkTargets } from "@/lib/review-content"

interface BlastBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly summary: readonly { readonly verdict: Verdict, readonly label: string }[]
  readonly summaryLabel: string
  readonly board: BlastBoard
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const BlastBand = ({
  anchorId,
  heading,
  summary,
  summaryLabel,
  board,
  codeLinks,
  onOpenCodeLink,
}: BlastBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 pb-2 text-sm">
      {summary.map((entry) => (
        <li key={entry.verdict} className="flex items-center gap-1.5 tabular-nums">
          <VerdictMark verdict={entry.verdict} />
          {entry.label}
        </li>
      ))}
      <li className="text-muted-foreground tabular-nums">{summaryLabel}</li>
    </ul>
    <BlastDiagram title={heading} board={board} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </section>
)

export default BlastBand
