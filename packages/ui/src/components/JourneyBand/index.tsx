import type { ReactNode } from "react"
import Button from "@/components/blocks/button"
import JourneyFlowDiagram, { type JourneyAuthoring, type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
import Prose from "@/components/Prose"
import Unwritten from "@/components/Unwritten"
import type { CodeDefinitions, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

interface JourneyDiagram {
  readonly anchorId: string
  readonly title: string
  readonly description: ProseBlocks | null
  readonly descriptionMarkdown: string
  readonly unwrittenLabel: string
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyEdge[]
}

export interface DescriptionEditing {
  readonly isWriting: boolean
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onEdit: () => void
  readonly onSave: (markdown: string) => void
  readonly onCancel: () => void
}

export interface DescriptionEditorRequest {
  readonly label: string
  readonly markdown: string
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onSave: (markdown: string) => void
  readonly onCancel: () => void
}

export interface JourneyBandAuthoring {
  readonly board: JourneyAuthoring
  readonly description: DescriptionEditing
  readonly onAddDiagram: () => void
}

interface JourneyBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly diagram: JourneyDiagram | null
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly authoring?: JourneyBandAuthoring | null
  readonly renderDescriptionEditor?: ((request: DescriptionEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const ADD_DIAGRAM_LABEL = "Add a diagram"
const EDIT_DESCRIPTION_LABEL = "Edit"
const NO_DIAGRAM_MESSAGE = "This segment has no Journey Flow Diagram."
const DESCRIPTION_SKELETON_LINE_COUNT = 3
const DESCRIPTION_CLASSES = "max-w-[44rem] pb-4"

interface DescriptionProps {
  readonly heading: string
  readonly diagram: JourneyDiagram
  readonly codeLinks: CodeLinkTargets
  readonly editing: DescriptionEditing | null
  readonly renderEditor: ((request: DescriptionEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
}

const Description = ({ heading, diagram, codeLinks, editing, renderEditor, onOpenCodeLink }: DescriptionProps) => {
  if (editing?.isWriting === true && renderEditor !== null) {
    return (
      <div className="pb-4">
        {renderEditor({
          label: `${heading} description`,
          markdown: diagram.descriptionMarkdown,
          isSaving: editing.isSaving,
          errorMessage: editing.errorMessage,
          onSave: editing.onSave,
          onCancel: editing.onCancel,
        })}
      </div>
    )
  }
  return diagram.description === null
    ? (
        <Unwritten isPending lineCount={DESCRIPTION_SKELETON_LINE_COUNT} className={cn(DESCRIPTION_CLASSES, "text-base")}>
          <p className={cn(DESCRIPTION_CLASSES, "text-muted-foreground")}>{diagram.unwrittenLabel}</p>
        </Unwritten>
      )
    : <Prose blocks={diagram.description} codeLinks={codeLinks} className={DESCRIPTION_CLASSES} onOpenCodeLink={onOpenCodeLink} />
}

const JourneyBand = ({
  anchorId,
  heading,
  diagram,
  codeLinks,
  codeDefinitions,
  isReviewPending,
  authoring = null,
  renderDescriptionEditor = null,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: JourneyBandProps) => {
  const canEditDescription = authoring !== null && diagram !== null && renderDescriptionEditor !== null && !authoring.description.isWriting
  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
      <div className="flex items-center gap-3 pb-4">
        <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
        {authoring !== null && diagram === null
          ? <Button variant="link" size="sm" disabled={authoring.board.isPending} onClick={authoring.onAddDiagram}>{ADD_DIAGRAM_LABEL}</Button>
          : null}
        {canEditDescription ? <Button variant="link" size="sm" onClick={authoring.description.onEdit}>{EDIT_DESCRIPTION_LABEL}</Button> : null}
      </div>
      {authoring !== null && diagram === null ? <p className="text-muted-foreground">{NO_DIAGRAM_MESSAGE}</p> : null}
      {diagram === null
        ? null
        : (
            <section id={diagram.anchorId} aria-label={diagram.title} className="scroll-mt-(--section-scroll-margin)">
              <Description
                heading={heading}
                diagram={diagram}
                codeLinks={codeLinks}
                editing={authoring?.description ?? null}
                renderEditor={renderDescriptionEditor}
                onOpenCodeLink={onOpenCodeLink}
              />
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
}

export default JourneyBand
