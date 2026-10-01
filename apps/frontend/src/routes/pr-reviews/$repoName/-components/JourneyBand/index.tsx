import DiagramConfigurationBar, { type DiagramConfiguration } from "@flightplan/ui/DiagramConfigurationBar"
import { EdgeLegend } from "@flightplan/ui/DiagramEdges"
import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode } from "@flightplan/ui/JourneyFlowDiagram"
import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"

interface JourneyDiagram {
  readonly anchorId: string
  readonly title: string
  readonly summaryLabel: string
  readonly width: number
  readonly height: number
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyEdge[]
}

interface JourneyBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly absence: ProseBlocks | null
  readonly configuration: DiagramConfiguration | null
  readonly legend: readonly { readonly kind: "call" | "value" | "data" | "assumed", readonly label: string }[]
  readonly diagram: JourneyDiagram | null
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onLevelsChange: (levels: number | null) => void
  readonly onToggle: (key: "data" | "assumed", isOn: boolean) => void
}

const JourneyBand = ({
  anchorId,
  heading,
  absence,
  configuration,
  legend,
  diagram,
  codeLinks,
  onOpenCodeLink,
  onLevelsChange,
  onToggle,
}: JourneyBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-3 text-lg leading-7 font-bold">{heading}</h2>
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
          <div className="flex flex-col gap-3 pb-2">
            <DiagramConfigurationBar configuration={configuration} onLevelsChange={onLevelsChange} onToggle={onToggle} />
            <EdgeLegend items={legend} />
          </div>
        )}
    {diagram === null
      ? null
      : (
          <section id={diagram.anchorId} aria-label={diagram.title} className="scroll-mt-(--section-scroll-margin) pt-4">
            <div className="flex items-baseline gap-3 pb-2">
              <h3 className="text-base leading-6 font-bold">{diagram.title}</h3>
              <p className="text-sm text-muted-foreground tabular-nums">{diagram.summaryLabel}</p>
            </div>
            <JourneyFlowDiagram
              title={diagram.title}
              width={diagram.width}
              height={diagram.height}
              nodes={diagram.nodes}
              edges={diagram.edges}
              codeLinks={codeLinks}
              onOpenCodeLink={onOpenCodeLink}
            />
          </section>
        )}
  </section>
)

export default JourneyBand
