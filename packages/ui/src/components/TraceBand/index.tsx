import { useState, type KeyboardEvent, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import Prose from "@/components/Prose"
import TraceDiagram, { type CardMoving, type TraceAuthoring, type TraceEdge, type TraceNode } from "@/components/TraceDiagram"
import Unwritten from "@/components/Unwritten"
import { NoWriteUpTag } from "@/components/WriteUpIcon"
import type { CodeDefinitions, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { TAB_CLASSES, TAB_LIST_CLASSES, tabIndexAfterKey } from "@/lib/tab-bar"
import { cn } from "@/lib/utils"

export type { CardMoving }

interface BandDiagram {
  readonly anchorId: string
  readonly title: string
  readonly description: ProseBlocks | null
  readonly descriptionMarkdown: string
  readonly unwrittenLabel: string
  readonly descriptionHint?: string | null
  readonly nodes: readonly TraceNode[]
  readonly edges: readonly TraceEdge[]
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

export interface TraceTab {
  readonly id: string
  readonly label: string
  readonly diagram: BandDiagram
}

export interface TraceTabEditing {
  readonly authoringOf: (tabId: string) => TraceBandAuthoring | null
  readonly cardMovingOf: (tabId: string) => CardMoving | null
  readonly writeUpOf: (tabId: string) => ((nodeId: string) => void) | null
}

export interface TraceBandAuthoring {
  readonly board: TraceAuthoring
  readonly description: DescriptionEditing
  readonly onAddDiagram: () => void
}

interface TraceBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly diagram: BandDiagram | null
  readonly tabs?: readonly TraceTab[]
  readonly tabEditing?: TraceTabEditing | null
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly writeUpNotice?: string | null
  readonly onWriteUpNode?: ((nodeId: string) => void) | null
  readonly authoring?: TraceBandAuthoring | null
  readonly cardMoving?: CardMoving | null
  readonly renderDescriptionEditor?: ((request: DescriptionEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const ADD_DIAGRAM_LABEL = "Add a diagram"
const VIEW_SECTION_ID = "trace-diagram-section"
const EDIT_DESCRIPTION_LABEL = "Edit"
const NO_DIAGRAM_MESSAGE = "This segment has no Trace Diagram."
const DESCRIPTION_SKELETON_LINE_COUNT = 3
const DESCRIPTION_CLASSES = "max-w-[55rem] pb-4"

interface DescriptionProps {
  readonly heading: string
  readonly diagram: BandDiagram
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
          <p className={cn(DESCRIPTION_CLASSES, "text-muted-foreground")}>{diagram.descriptionHint ?? diagram.unwrittenLabel}</p>
        </Unwritten>
      )
    : <Prose blocks={diagram.description} codeLinks={codeLinks} className={DESCRIPTION_CLASSES} onOpenCodeLink={onOpenCodeLink} />
}

interface DiagramPanelProps {
  readonly anchorId: string
  readonly heading: string
  readonly diagram: BandDiagram
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly authoring: TraceBandAuthoring | null
  readonly cardMoving: CardMoving | null
  readonly onWriteUpNode: ((nodeId: string) => void) | null
  readonly renderDescriptionEditor: ((request: DescriptionEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

const NO_TABS: readonly TraceTab[] = []
const NO_TAB_EDITING: TraceTabEditing = { authoringOf: () => null, cardMovingOf: () => null, writeUpOf: () => null }

const DiagramPanel = ({
  anchorId,
  heading,
  diagram,
  codeLinks,
  codeDefinitions,
  isReviewPending,
  authoring,
  cardMoving,
  onWriteUpNode,
  renderDescriptionEditor,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: DiagramPanelProps) => (
  <>
    <Description
      heading={heading}
      diagram={diagram}
      codeLinks={codeLinks}
      editing={authoring?.description ?? null}
      renderEditor={renderDescriptionEditor}
      onOpenCodeLink={onOpenCodeLink}
    />
    <TraceDiagram
      title={diagram.title}
      nodes={diagram.nodes}
      edges={diagram.edges}
      codeLinks={codeLinks}
      codeDefinitions={codeDefinitions}
      isReviewPending={isReviewPending}
      authoring={authoring?.board ?? null}
      cardMoving={cardMoving}
      navigatorAnchorId={anchorId}
      onWriteUpNode={onWriteUpNode}
      onOpenCodeLink={onOpenCodeLink}
      onWaypointReviewedChange={onWaypointReviewedChange}
    />
  </>
)

interface DiagramTabsProps extends Omit<DiagramPanelProps, "diagram" | "authoring" | "cardMoving" | "onWriteUpNode"> {
  readonly tabs: readonly TraceTab[]
  readonly tabEditing: TraceTabEditing
}

const DiagramTabs = ({ tabs, tabEditing, ...panel }: DiagramTabsProps) => {
  const [openIndex, setOpenIndex] = useState(0)
  const openTab = tabs.at(openIndex) ?? tabs[0]
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const nextIndex = tabIndexAfterKey(event.key, openIndex, tabs.length)
    if (nextIndex === null) return
    event.preventDefault()
    setOpenIndex(nextIndex)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]").item(nextIndex).focus()
  }
  return (
    <>
      <div role="tablist" aria-label={panel.heading} className={cn(TAB_LIST_CLASSES, "mb-4")}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={index === openIndex}
            aria-controls={index === openIndex ? openTab.diagram.anchorId : undefined}
            tabIndex={index === openIndex ? 0 : -1}
            className={TAB_CLASSES}
            onClick={() => { setOpenIndex(index) }}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section id={openTab.diagram.anchorId} role="tabpanel" aria-label={openTab.label} data-view-section-id={VIEW_SECTION_ID} className="scroll-mt-(--section-scroll-margin)">
        <DiagramPanel
          key={openTab.id}
          {...panel}
          diagram={openTab.diagram}
          authoring={tabEditing.authoringOf(openTab.id)}
          cardMoving={tabEditing.cardMovingOf(openTab.id)}
          onWriteUpNode={tabEditing.writeUpOf(openTab.id)}
        />
      </section>
    </>
  )
}

const TraceBand = ({
  anchorId,
  heading,
  diagram,
  tabs = NO_TABS,
  tabEditing = null,
  codeLinks,
  codeDefinitions,
  isReviewPending,
  writeUpNotice = null,
  onWriteUpNode = null,
  authoring = null,
  cardMoving = null,
  renderDescriptionEditor = null,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: TraceBandProps) => {
  const canEditDescription = authoring !== null && diagram !== null && renderDescriptionEditor !== null && !authoring.description.isWriting
  const panel = { anchorId, heading, codeLinks, codeDefinitions, isReviewPending, renderDescriptionEditor, onOpenCodeLink, onWaypointReviewedChange }
  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-heading`} data-view-section-id={VIEW_SECTION_ID} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
      <div className="flex items-center gap-3 pb-4">
        <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
        {writeUpNotice === null ? null : <NoWriteUpTag label={writeUpNotice} />}
        {authoring !== null && diagram === null && tabs.length === 0
          ? <Button variant="link" size="sm" disabled={authoring.board.isPending} onClick={authoring.onAddDiagram}>{ADD_DIAGRAM_LABEL}</Button>
          : null}
        {canEditDescription ? <Button variant="link" size="sm" onClick={authoring.description.onEdit}>{EDIT_DESCRIPTION_LABEL}</Button> : null}
      </div>
      {authoring !== null && diagram === null && tabs.length === 0 ? <p className="text-muted-foreground">{NO_DIAGRAM_MESSAGE}</p> : null}
      {tabs.length === 0 ? null : <DiagramTabs {...panel} tabs={tabs} tabEditing={tabEditing ?? NO_TAB_EDITING} />}
      {diagram === null || tabs.length > 0
        ? null
        : (
            <section id={diagram.anchorId} aria-label={diagram.title} data-view-section-id={VIEW_SECTION_ID} className="scroll-mt-(--section-scroll-margin)">
              <DiagramPanel {...panel} diagram={diagram} authoring={authoring} cardMoving={cardMoving} onWriteUpNode={onWriteUpNode} />
            </section>
          )}
    </section>
  )
}

export default TraceBand
