import { useState, type ReactNode } from "react"
import Button from "@flightplan/ui/blocks/button"
import { submitHandlerOf } from "@flightplan/ui/lib/form-submit"
import TextEditor, { type CodeLinkRequest } from "@flightplan/ui/TextEditor"

interface ContextEditorProps {
  readonly label: string
  readonly markdown: string
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onSave: (markdown: string) => void
  readonly onCancel: () => void
}

const ContextEditor = ({ label, markdown, isSaving, errorMessage, renderCodeLinkDialog, onSave, onCancel }: ContextEditorProps) => {
  const [draft, setDraft] = useState(markdown)
  return (
    <form onSubmit={submitHandlerOf(() => { onSave(draft) })} className="grid gap-3">
      <TextEditor
        label={label}
        value={markdown}
        errorMessage={errorMessage}
        canUseSections
        renderCodeLinkDialog={renderCodeLinkDialog}
        onChange={setDraft}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  )
}

export default ContextEditor
