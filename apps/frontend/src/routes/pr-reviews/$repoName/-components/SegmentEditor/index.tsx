import { useId, useState } from "react"
import { useFileSearch } from "@/routes/pr-reviews/$repoName/-hooks/use-file-search"
import Button from "@flightplan/ui/blocks/button"
import Input from "@flightplan/ui/blocks/input"
import FilePicker from "@flightplan/ui/FilePicker"
import IconButton from "@flightplan/ui/IconButton"
import { submitHandlerOf } from "@flightplan/ui/lib/form-submit"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface SegmentContent {
  readonly title: string
  readonly paths: readonly string[]
}

interface SegmentEditorProps {
  readonly reviewKey: ReviewKey
  readonly legend: string
  readonly label: string
  readonly paths: readonly string[]
  readonly isSaving: boolean
  readonly isDeleting: boolean
  readonly errorMessage: string | null
  readonly onSave: (content: SegmentContent) => void
  readonly onDelete: (() => void) | null
  readonly onClose: () => void
}

const LABEL_LABEL = "Label"
const FILES_LABEL = "Files"
const NO_FILES_MESSAGE = "No files yet."
const ADD_FILE_LABEL = "Add a file"
const ADD_FILE_PLACEHOLDER = "Search the changed files"
const CLOSE_LABEL = "Close"
const DELETE_LABEL = "Delete"

const SegmentEditor = ({ reviewKey, legend, label, paths, isSaving, isDeleting, errorMessage, onSave, onDelete, onClose }: SegmentEditorProps) => {
  const labelId = useId()
  const filesId = useId()
  const fileSearch = useFileSearch(reviewKey, "changed")
  const [draftLabel, setDraftLabel] = useState(label)
  const [draftPaths, setDraftPaths] = useState(paths)

  const handleAddFile = (addedPath: string): void => {
    setDraftPaths((heldPaths) => (heldPaths.includes(addedPath) ? heldPaths : [...heldPaths, addedPath]))
    fileSearch.onQueryChange("")
  }

  return (
    <form
      aria-label={legend}
      onSubmit={submitHandlerOf(() => { onSave({ title: draftLabel, paths: draftPaths }) })}
      className="relative mt-6 grid max-w-[44rem] gap-4 rounded-lg border border-foreground p-4"
    >
      <IconButton icon="close" label={CLOSE_LABEL} className="absolute top-2 right-2" onClick={onClose} />
      <div className="grid gap-1.5 pr-8">
        <label htmlFor={labelId} className="text-sm font-bold">{LABEL_LABEL}</label>
        <Input id={labelId} value={draftLabel} onChange={(event) => { setDraftLabel(event.target.value) }} />
      </div>
      <div className="grid gap-1.5">
        <p id={filesId} className="text-sm font-bold">{FILES_LABEL}</p>
        {draftPaths.length === 0
          ? <p className="text-sm text-muted-foreground">{NO_FILES_MESSAGE}</p>
          : (
              <ul aria-labelledby={filesId} className="grid gap-0.5">
                {draftPaths.map((path) => (
                  <li key={path} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[0.8rem]" title={path}>{path}</span>
                    <IconButton
                      icon="close"
                      label={`Remove ${path}`}
                      onClick={() => { setDraftPaths((heldPaths) => heldPaths.filter((heldPath) => heldPath !== path)) }}
                    />
                  </li>
                ))}
              </ul>
            )}
      </div>
      <FilePicker
        label={ADD_FILE_LABEL}
        hint={null}
        placeholder={ADD_FILE_PLACEHOLDER}
        query={fileSearch.query}
        files={fileSearch.files}
        message={fileSearch.message}
        errorMessage={fileSearch.errorMessage}
        onQueryChange={fileSearch.onQueryChange}
        onSelect={handleAddFile}
      />
      {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <div className="flex justify-end gap-2">
        {onDelete === null
          ? null
          : <Button type="button" variant="destructive" disabled={isDeleting} onClick={onDelete}>{DELETE_LABEL}</Button>}
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  )
}

export default SegmentEditor
