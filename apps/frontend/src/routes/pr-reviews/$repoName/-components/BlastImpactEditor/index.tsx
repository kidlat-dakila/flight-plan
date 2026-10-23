import { useState, type ReactNode } from "react"
import { useBlastEditing } from "@/routes/pr-reviews/$repoName/-hooks/use-blast-editing"
import type { BlastImpactEditorRequest } from "@flightplan/ui/BlastBand"
import Button from "@flightplan/ui/blocks/button"
import { submitHandlerOf } from "@flightplan/ui/lib/form-submit"
import SelectField from "@flightplan/ui/SelectField"
import TextEditor, { type CodeLinkRequest } from "@flightplan/ui/TextEditor"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface BlastImpactEditorProps extends BlastImpactEditorRequest {
  readonly reviewKey: ReviewKey
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
}

const BlastImpactEditor = ({ reviewKey, path, assessment, form, renderCodeLinkDialog, onClose }: BlastImpactEditorProps) => {
  const [impactType, setImpactType] = useState(assessment.impactType)
  const [impactReason, setImpactReason] = useState(assessment.impactReason)
  const editing = useBlastEditing(reviewKey, path, onClose)
  const hasReason = form.choices.some((choice) => choice.value === impactType && choice.hasReason)
  return (
    <form onSubmit={submitHandlerOf(() => { editing.onSave({ impactType, impactReason }) })} className="grid gap-3">
      <SelectField
        label={form.impactTypeLabel}
        options={form.choices}
        value={impactType}
        errorMessage={hasReason ? null : editing.errorMessage}
        onTroubleshoot={hasReason ? null : editing.onTroubleshoot}
        onChange={(value) => {
          const chosen = form.choices.find((choice) => choice.value === value)
          if (chosen !== undefined) setImpactType(chosen.value)
        }}
      />
      <div hidden={!hasReason}>
        <TextEditor
          label={form.impactReasonLabel}
          value={assessment.impactReason}
          errorMessage={hasReason ? editing.errorMessage : null}
          onTroubleshoot={hasReason ? editing.onTroubleshoot : null}
          renderCodeLinkDialog={renderCodeLinkDialog}
          onChange={setImpactReason}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={editing.isSaving}>{editing.isSaving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  )
}

export default BlastImpactEditor
