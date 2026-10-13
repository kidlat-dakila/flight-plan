import Button from "@/components/blocks/button"
import JourneyFlowDiagram, { type JourneyAuthoring, type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
import type { CodeDefinitions, CodeLinkTargets } from "@/lib/review-content"

interface JourneyDiagram {
  readonly anchorId: string
  readonly title: string
  readonly summaryLabel: string
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyEdge[]
}

export interface JourneyBandAuthoring {
  readonly board: JourneyAuthoring
  readonly onAddDiagram: () => void
  readonly onRemoveDiagram: () => void
  readonly onAddCard: () => void
}

interface JourneyBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly diagram: JourneyDiagram | null
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly authoring?: JourneyBandAuthoring | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const ADD_DIAGRAM_LABEL = "Add a diagram"
const REMOVE_DIAGRAM_LABEL = "Remove the diagram"
const ADD_CARD_LABEL = "Add a card"
const NO_DIAGRAM_MESSAGE = "This segment has no Journey Flow Diagram."
const AUTHORING_HINT = "Drag a card to move it. Drag from the dot of a row onto another card to draw a line: it ends at the side of the card you drop it nearest to, the left, the top or the bottom. Drop it on the empty board to add a card at its end."

const JourneyBand = ({
  anchorId,
  heading,
  diagram,
  codeLinks,
  codeDefinitions,
  isReviewPending,
  authoring = null,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: JourneyBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <div className="flex items-center gap-3 pb-4">
      <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
      {authoring !== null && diagram === null
        ? <Button variant="link" size="sm" disabled={authoring.board.isPending} onClick={authoring.onAddDiagram}>{ADD_DIAGRAM_LABEL}</Button>
        : null}
      {authoring !== null && diagram !== null
        ? (
            <>
              <Button variant="link" size="sm" onClick={authoring.onAddCard}>{ADD_CARD_LABEL}</Button>
              <Button variant="link" size="sm" disabled={authoring.board.isPending} onClick={authoring.onRemoveDiagram}>{REMOVE_DIAGRAM_LABEL}</Button>
            </>
          )
        : null}
    </div>
    {authoring !== null && diagram === null ? <p className="text-muted-foreground">{NO_DIAGRAM_MESSAGE}</p> : null}
    {diagram === null
      ? null
      : (
          <section id={diagram.anchorId} aria-label={diagram.title} className="scroll-mt-(--section-scroll-margin) pt-4">
            <div className="flex items-baseline gap-3 pb-2">
              <h3 className="text-base leading-6 font-bold">{diagram.title}</h3>
              <p className="text-sm text-muted-foreground tabular-nums">{diagram.summaryLabel}</p>
            </div>
            {authoring === null ? null : <p className="pb-2 text-sm text-muted-foreground">{AUTHORING_HINT}</p>}
            <JourneyFlowDiagram
              title={diagram.title}
              nodes={diagram.nodes}
              edges={diagram.edges}
              codeLinks={codeLinks}
              codeDefinitions={codeDefinitions}
              isReviewPending={isReviewPending}
              authoring={authoring?.board ?? null}
              onOpenCodeLink={onOpenCodeLink}
              onWaypointReviewedChange={onWaypointReviewedChange}
            />
          </section>
        )}
  </section>
)

export default JourneyBand
