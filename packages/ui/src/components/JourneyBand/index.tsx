import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
import type { CodeDefinitions, CodeLinkTargets } from "@/lib/review-content"

interface JourneyDiagram {
  readonly anchorId: string
  readonly title: string
  readonly summaryLabel: string
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyEdge[]
}

interface JourneyBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly diagram: JourneyDiagram | null
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const JourneyBand = ({
  anchorId,
  heading,
  diagram,
  codeLinks,
  codeDefinitions,
  isReviewPending,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: JourneyBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
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
              nodes={diagram.nodes}
              edges={diagram.edges}
              codeLinks={codeLinks}
              codeDefinitions={codeDefinitions}
              isReviewPending={isReviewPending}
              onOpenCodeLink={onOpenCodeLink}
              onWaypointReviewedChange={onWaypointReviewedChange}
            />
          </section>
        )}
  </section>
)

export default JourneyBand
