import { lazy, Suspense, type ReactNode } from "react"
import Button from "@flightplan/ui/blocks/button"
import ContextSection from "@flightplan/ui/ContextSection"
import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"
import type { CodeLinkRequest } from "@flightplan/ui/TextEditor"
import Unwritten from "@flightplan/ui/Unwritten"

const ContextEditor = lazy(async () => await import("@/routes/pr-reviews/$repoName/-components/ContextEditor"))

export interface ContextEditing {
  readonly isWriting: boolean
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onEdit: () => void
  readonly onSave: (markdown: string) => void
  readonly onCancel: () => void
}

interface ContextBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly context: ProseBlocks
  readonly markdown: string
  readonly isDraft: boolean
  readonly unwrittenLabel: string
  readonly codeLinks: CodeLinkTargets
  readonly editing: ContextEditing | null
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onOpenCodeLink: (anchorId: string) => void
}

const EDITOR_LOADING_LABEL = "Loading the editor…"

const ContextBand = ({
  anchorId,
  heading,
  context,
  markdown,
  isDraft,
  unwrittenLabel,
  codeLinks,
  editing,
  renderCodeLinkDialog,
  onOpenCodeLink,
}: ContextBandProps) => {
  const isWriting = editing?.isWriting === true
  return (
    <ContextSection
      anchorId={anchorId}
      heading={heading}
      action={editing === null || isWriting ? null : <Button variant="link" size="sm" onClick={editing.onEdit}>Edit</Button>}
    >
      {editing !== null && isWriting
        ? (
            <Suspense fallback={<p className="text-sm text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
              <ContextEditor
                label={heading}
                markdown={markdown}
                isSaving={editing.isSaving}
                errorMessage={editing.errorMessage}
                renderCodeLinkDialog={renderCodeLinkDialog}
                onSave={editing.onSave}
                onCancel={editing.onCancel}
              />
            </Suspense>
          )
        : null}
      {!isWriting && isDraft
        ? (
            <Unwritten isPending lineCount={4} className="max-w-[44rem] text-base">
              <p className="text-muted-foreground">{unwrittenLabel}</p>
            </Unwritten>
          )
        : null}
      {!isWriting && !isDraft ? <Prose blocks={context} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /> : null}
    </ContextSection>
  )
}

export default ContextBand
