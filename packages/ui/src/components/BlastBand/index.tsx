import BlastDiagram, { type BlastBoard } from "@/components/BlastDiagram"
import Prose from "@/components/Prose"
import VerdictMark, { type Verdict } from "@/components/VerdictMark"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"

interface BlastBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly absence: ProseBlocks | null
  readonly summary: readonly { readonly verdict: Verdict, readonly label: string }[]
  readonly summaryLabel: string
  readonly board: BlastBoard | null
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const BlastBand = ({
  anchorId,
  heading,
  absence,
  summary,
  summaryLabel,
  board,
  codeLinks,
  onOpenCodeLink,
}: BlastBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    {absence === null
      ? null
      : (
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)]">
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className="h-3 w-1 bg-(--line)" />
              <span className="h-1 w-4 bg-(--line)" />
            </span>
            <Prose blocks={absence} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
          </div>
        )}
    {board === null
      ? null
      : (
          <>
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
          </>
        )}
  </section>
)

export default BlastBand
