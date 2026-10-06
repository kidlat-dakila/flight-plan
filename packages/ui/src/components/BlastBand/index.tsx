import BlastDiagram, { type BlastBoard } from "@/components/BlastDiagram"
import DiagramConfigurationBar, { type DiagramConfiguration } from "@/components/DiagramConfigurationBar"
import { EdgeLegend } from "@/components/DiagramEdges"
import Prose from "@/components/Prose"
import VerdictMark, { type Verdict } from "@/components/VerdictMark"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"

interface BlastBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly absence: ProseBlocks | null
  readonly configuration: DiagramConfiguration | null
  readonly legend: readonly { readonly kind: "call" | "value" | "data" | "assumed", readonly label: string }[]
  readonly summary: readonly { readonly verdict: Verdict, readonly label: string }[]
  readonly summaryLabel: string
  readonly board: BlastBoard | null
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onLevelsChange: (levels: number | null) => void
  readonly onToggle: (key: "data" | "assumed", isOn: boolean) => void
}

const BlastBand = ({
  anchorId,
  heading,
  absence,
  configuration,
  legend,
  summary,
  summaryLabel,
  board,
  codeLinks,
  onOpenCodeLink,
  onLevelsChange,
  onToggle,
}: BlastBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-3 text-xl leading-7 font-bold text-(--line)">{heading}</h2>
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
    {configuration === null
      ? null
      : (
          <div className="flex flex-col gap-3 pb-3">
            <DiagramConfigurationBar configuration={configuration} onLevelsChange={onLevelsChange} onToggle={onToggle} />
            <EdgeLegend items={legend} />
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
