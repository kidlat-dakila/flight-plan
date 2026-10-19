import { useId, useState, type ReactNode } from "react"
import { useWaypointEditing, type WaypointText } from "@/routes/pr-reviews/$repoName/-hooks/use-waypoint-editing"
import Button from "@flightplan/ui/blocks/button"
import Input from "@flightplan/ui/blocks/input"
import TextEditor, { type CodeLinkRequest } from "@flightplan/ui/TextEditor"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface WaypointEditorProps {
  readonly reviewKey: ReviewKey
  readonly segmentId: string
  readonly waypointId: string
  readonly legend: string
  readonly text: WaypointText
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onClose: () => void
}

const TITLE_LABEL = "Title"
const READING_LABEL = "Reading"
const READING_HINT = "Say what you changed in this code and what the change is for."
const CORE_CHANGE_LABEL = "Core change"
const ATTENTION_HINT = "Mark this change as an important part of the code review. This helps the reviewer see where to look first."
const ATTENTION_REASON_LABEL = "Additional context (optional)"
const ATTENTION_REASON_HINT = "Say why this change is important, or what the reviewer should check in it."

const WaypointEditor = ({ reviewKey, segmentId, waypointId, legend, text, renderCodeLinkDialog, onClose }: WaypointEditorProps) => {
  const titleId = useId()
  const attentionHintId = useId()
  const [title, setTitle] = useState(text.title)
  const [reading, setReading] = useState(text.reading)
  const [isCoreChange, setIsCoreChange] = useState(text.coreChange !== null)
  const [coreChangeReason, setCoreChangeReason] = useState(text.coreChange ?? "")
  const editing = useWaypointEditing(reviewKey, { segmentId, waypointId }, onClose)
  return (
    <form
      aria-label={legend}
      action={() => { editing.onSave({ title, reading, coreChange: isCoreChange ? coreChangeReason : null }) }}
      className="grid gap-3"
    >
      <div className="grid gap-1.5">
        <label htmlFor={titleId} className="text-sm font-bold">{TITLE_LABEL}</label>
        <Input id={titleId} value={title} onChange={(event) => { setTitle(event.target.value) }} />
      </div>
      <div className="grid gap-1.5">
        <p aria-hidden="true" className="text-sm font-bold">{READING_LABEL}</p>
        <p className="text-sm text-muted-foreground">{READING_HINT}</p>
        <TextEditor
          label={READING_LABEL}
          value={text.reading}
          errorMessage={null}
          renderCodeLinkDialog={renderCodeLinkDialog}
          onChange={setReading}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" aria-describedby={attentionHintId} checked={isCoreChange} onChange={(event) => { setIsCoreChange(event.target.checked) }} />
        {CORE_CHANGE_LABEL}
      </label>
      <p id={attentionHintId} className="-mt-2 text-sm text-muted-foreground">{ATTENTION_HINT}</p>
      <div hidden={!isCoreChange} className="grid gap-1.5">
        <p aria-hidden="true" className="text-sm font-bold">{ATTENTION_REASON_LABEL}</p>
        <p className="text-sm text-muted-foreground">{ATTENTION_REASON_HINT}</p>
        <TextEditor
          label={ATTENTION_REASON_LABEL}
          value={text.coreChange ?? ""}
          errorMessage={null}
          renderCodeLinkDialog={renderCodeLinkDialog}
          onChange={setCoreChangeReason}
        />
      </div>
      {editing.errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{editing.errorMessage}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={editing.isSaving}>{editing.isSaving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  )
}

export default WaypointEditor
