import BlastDiagram, { type BlastBoard } from "@/components/BlastDiagram"
import BlastFileMark, { type BlastFileMarkKind } from "@/components/BlastFileMark"
import LabelSegments from "@/components/LabelSegments"
import type { CodeLinkTargets } from "@/lib/review-content"

interface BlastBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly summary: readonly string[]
  readonly legend: readonly { readonly mark: BlastFileMarkKind, readonly label: string }[]
  readonly edgeLegendLabel: string
  readonly board: BlastBoard
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onOpenFile: (anchorId: string) => void
}

const LEGEND_MARK_RADIUS = 4

const BlastBand = ({ anchorId, heading, summary, legend, edgeLegendLabel, board, codeLinks, onOpenCodeLink, onOpenFile }: BlastBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    <div className="flex flex-col gap-y-1 pb-2 text-sm">
      <LabelSegments segments={summary.map((text) => ({ text, kind: "plain" }))} className="tabular-nums" />
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
        {legend.map((entry) => (
          <li key={entry.mark} className="flex items-center gap-1.5">
            <BlastFileMark mark={entry.mark} radius={LEGEND_MARK_RADIUS} />
            {entry.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="22" height="10" viewBox="0 0 22 10" className="shrink-0">
            <path d="M1 5h14" className="fill-none stroke-current [stroke-width:1.25]" />
            <path d="M14 1.5 21 5 14 8.5z" className="fill-current" />
          </svg>
          {edgeLegendLabel}
        </li>
      </ul>
    </div>
    <BlastDiagram title={heading} board={board} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} onOpenFile={onOpenFile} />
  </section>
)

export default BlastBand
