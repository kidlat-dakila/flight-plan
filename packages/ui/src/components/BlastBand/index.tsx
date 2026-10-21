import { useState, type ReactNode } from "react"
import BlastDiagram, { type BlastAssessment, type BlastBoard, type BlastImpactChoice } from "@/components/BlastDiagram"
import BlastFileMark, { type BlastFileMarkKind } from "@/components/BlastFileMark"
import LabelSegments from "@/components/LabelSegments"
import { NoWriteUpTag } from "@/components/WriteUpIcon"
import { navigatorButtonOf } from "@/lib/navigator-controls"
import type { CodeLinkTargets } from "@/lib/review-content"

export interface BlastAssessmentForm {
  readonly editLabel: string
  readonly impactTypeLabel: string
  readonly impactReasonLabel: string
  readonly choices: readonly { readonly value: BlastImpactChoice, readonly label: string, readonly hasReason: boolean }[]
}

export interface BlastImpactEditorRequest {
  readonly path: string
  readonly assessment: BlastAssessment
  readonly form: BlastAssessmentForm
  readonly onClose: () => void
}

export type BlastViewId = "export-bound" | "import-bound"

export interface BlastView {
  readonly id: BlastViewId
  readonly label: string
  readonly description: string
  readonly summary: readonly string[]
  readonly legend: readonly { readonly mark: BlastFileMarkKind, readonly label: string }[]
  readonly edgeLegendLabel: string
  readonly board: BlastBoard
}

interface BlastBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly defaultViewId: BlastViewId
  readonly assessmentForm: BlastAssessmentForm
  readonly views: readonly BlastView[]
  readonly codeLinks: CodeLinkTargets
  readonly writeUpNotice?: string | null
  readonly onWriteUpFile?: ((path: string) => void) | null
  readonly renderImpactEditor: ((request: BlastImpactEditorRequest) => ReactNode) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onOpenFile: (anchorId: string) => void
}

const LEGEND_MARK_RADIUS = 4
const FEWEST_VIEWS_TO_SWITCH = 2
const VIEW_KEYS: Readonly<Record<BlastViewId, string>> = { "export-bound": "e", "import-bound": "q" }

const BlastBand = ({
  anchorId,
  heading,
  defaultViewId,
  assessmentForm,
  views,
  codeLinks,
  writeUpNotice = null,
  onWriteUpFile = null,
  renderImpactEditor,
  onOpenCodeLink,
  onOpenFile,
}: BlastBandProps) => {
  const [chosenViewId, setChosenViewId] = useState<BlastViewId | null>(null)
  const view = views.find((candidate) => candidate.id === (chosenViewId ?? defaultViewId)) ?? views.at(0)
  if (view === undefined) return null
  return (
    <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
      <div className="flex items-center gap-3 pb-4">
        <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
        {writeUpNotice === null ? null : <NoWriteUpTag label={writeUpNotice} />}
      </div>
      <div className="flex flex-col gap-y-1 pb-2 text-sm">
        <LabelSegments segments={view.summary.map((text) => ({ text, kind: "plain" }))} className="tabular-nums" />
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
          {view.legend.map((entry) => (
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
            {view.edgeLegendLabel}
          </li>
        </ul>
      </div>
      <BlastDiagram
        title={heading}
        board={view.board}
        codeLinks={codeLinks}
        onWriteUpFile={onWriteUpFile}
        navigation={{
          anchorId,
          groups: views.length < FEWEST_VIEWS_TO_SWITCH
            ? []
            : [views.map((candidate) => navigatorButtonOf({
                key: VIEW_KEYS[candidate.id],
                label: candidate.label,
                description: candidate.description,
                isPressed: candidate.id === view.id,
                onRun: () => { setChosenViewId(candidate.id) },
              }))],
        }}
        authoring={renderImpactEditor === null
          ? null
          : {
              editLabel: assessmentForm.editLabel,
              renderImpactEditor: (node, onClose): ReactNode =>
                node.assessment === null ? null : renderImpactEditor({ path: node.path, assessment: node.assessment, form: assessmentForm, onClose }),
            }}
        onOpenCodeLink={onOpenCodeLink}
        onOpenFile={onOpenFile}
      />
    </section>
  )
}

export default BlastBand
