import { useId, useState, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import Input from "@/components/blocks/input"
import Prose from "@/components/Prose"
import TabRow from "@/components/TabRow"
import TraceDiagram, { type CardMoving, type TraceAuthoring, type TraceEdge, type TraceNode } from "@/components/TraceDiagram"
import Unwritten from "@/components/Unwritten"
import { NoWriteUpTag } from "@/components/WriteUpIcon"
import { artifactPartMark } from "@/lib/artifact-part"
import type { CodeDefinitions, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type { CardMoving }

interface BandDiagram {
  readonly anchorId: string
  readonly title: string
  readonly writtenTitle: string | null
  readonly description: ProseBlocks | null
  readonly descriptionMarkdown: string
  readonly unwrittenLabel: string
  readonly descriptionHint?: string | null
  readonly nodes: readonly TraceNode[]
  readonly edges: readonly TraceEdge[]
}

export interface TraceWriting {
  readonly title: string
  readonly description: string
}

export interface DescriptionEditing {
  readonly isWriting: boolean
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly onEdit: () => void
  readonly onSave: (writing: TraceWriting) => void
  readonly onCancel: () => void
}

export interface DescriptionEditorRequest {
  readonly label: string
  readonly markdown: string
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
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
  readonly isFullScreenAtStart?: boolean
  readonly openTabIdAtStart?: string | null
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
const TITLE_FIELD_LABEL = "Title"
const HEADING_SKELETON_CLASSES = "w-80 max-w-full"

interface DescriptionProps {
  readonly heading: string
  readonly diagram: BandDiagram
  readonly codeLinks: CodeLinkTargets
  readonly editing: DescriptionEditing | null
  readonly renderEditor: ((request: DescriptionEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
}

interface WritingFormProps {
  readonly heading: string
  readonly diagram: BandDiagram
  readonly editing: DescriptionEditing
  readonly renderEditor: (request: DescriptionEditorRequest) => ReactNode
}

const WritingForm = ({ heading, diagram, editing, renderEditor }: WritingFormProps) => {
  const [title, setTitle] = useState(diagram.writtenTitle ?? "")
  const titleId = useId()
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex max-w-[55rem] flex-col gap-1.5">
        <label htmlFor={titleId} className="text-sm font-semibold text-foreground">{TITLE_FIELD_LABEL}</label>
        <Input id={titleId} value={title} disabled={editing.isSaving} onChange={(event) => { setTitle(event.target.value) }} />
      </div>
      {renderEditor({
        label: `${heading} description`,
        markdown: diagram.descriptionMarkdown,
        isSaving: editing.isSaving,
        errorMessage: editing.errorMessage,
        onTroubleshoot: editing.onTroubleshoot ?? null,
        onSave: (markdown) => { editing.onSave({ title, description: markdown }) },
        onCancel: editing.onCancel,
      })}
    </div>
  )
}

const Description = ({ heading, diagram, codeLinks, editing, renderEditor, onOpenCodeLink }: DescriptionProps) => {
  if (editing?.isWriting === true && renderEditor !== null) {
    return <WritingForm heading={heading} diagram={diagram} editing={editing} renderEditor={renderEditor} />
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
  readonly isFullScreenAtStart: boolean
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
  isFullScreenAtStart,
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
      isFullScreenAtStart={isFullScreenAtStart}
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
  readonly openTabIdAtStart: string | null
}

const FIRST_TAB_INDEX = 0

const tabIndexOf = (tabs: readonly TraceTab[], tabId: string | null): number =>
  Math.max(tabs.findIndex((tab) => tab.id === tabId), FIRST_TAB_INDEX)

const DiagramTabs = ({ tabs, tabEditing, openTabIdAtStart, ...panel }: DiagramTabsProps) => {
  const [openIndex, setOpenIndex] = useState(() => tabIndexOf(tabs, openTabIdAtStart))
  const openTab = tabs.at(openIndex) ?? tabs[0]
  const rowTabs = tabs.map((tab, index) => ({
    key: tab.id,
    label: tab.label,
    controlsId: index === openIndex ? openTab.diagram.anchorId : undefined,
  }))
  return (
    <>
      <TabRow tabs={rowTabs} openIndex={openIndex} label={panel.heading} className="mb-4" onOpen={setOpenIndex} />
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

interface BandHeadingProps {
  readonly heading: string
  readonly diagram: BandDiagram | null
  readonly isTabbed: boolean
}

const BandHeading = ({ heading, diagram, isTabbed }: BandHeadingProps) => {
  if (diagram === null || isTabbed) return <>{heading}</>
  return diagram.writtenTitle === null
    ? <Unwritten isPending className={HEADING_SKELETON_CLASSES}>{heading}</Unwritten>
    : <>{diagram.writtenTitle}</>
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
  isFullScreenAtStart = false,
  openTabIdAtStart = null,
  writeUpNotice = null,
  onWriteUpNode = null,
  authoring = null,
  cardMoving = null,
  renderDescriptionEditor = null,
  onOpenCodeLink,
  onWaypointReviewedChange,
}: TraceBandProps) => {
  const canEditDescription = authoring !== null && diagram !== null && renderDescriptionEditor !== null && !authoring.description.isWriting
  const panel = { anchorId, heading, codeLinks, codeDefinitions, isReviewPending, isFullScreenAtStart, renderDescriptionEditor, onOpenCodeLink, onWaypointReviewedChange }
  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-heading`} data-view-section-id={VIEW_SECTION_ID} {...artifactPartMark("trace-diagram")} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
      <div className="flex items-center gap-3 pb-4">
        <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">
          <BandHeading heading={heading} diagram={diagram} isTabbed={tabs.length > 0} />
        </h2>
        {writeUpNotice === null ? null : <NoWriteUpTag label={writeUpNotice} />}
        {authoring !== null && diagram === null && tabs.length === 0
          ? <Button variant="link" size="sm" disabled={authoring.board.isPending} onClick={authoring.onAddDiagram}>{ADD_DIAGRAM_LABEL}</Button>
          : null}
        {canEditDescription ? <Button variant="link" size="sm" onClick={authoring.description.onEdit}>{EDIT_DESCRIPTION_LABEL}</Button> : null}
      </div>
      {authoring !== null && diagram === null && tabs.length === 0 ? <p className="text-muted-foreground">{NO_DIAGRAM_MESSAGE}</p> : null}
      {tabs.length === 0 ? null : <DiagramTabs {...panel} tabs={tabs} tabEditing={tabEditing ?? NO_TAB_EDITING} openTabIdAtStart={openTabIdAtStart} />}
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
