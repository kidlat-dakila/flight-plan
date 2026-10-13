import { useId, useState, type ReactNode } from "react"
import { useCardForm } from "@/routes/pr-reviews/$repoName/-hooks/use-card-form"
import { useFileCode } from "@/routes/pr-reviews/$repoName/-hooks/use-file-code"
import type { CardChange, CardContent, CardForm } from "@/routes/pr-reviews/$repoName/-hooks/use-journey-editing"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import Input from "@flightplan/ui/blocks/input"
import CodeViewEditor from "@flightplan/ui/CodeViewEditor"
import IconButton from "@flightplan/ui/IconButton"
import { rangeLabelOf, type LineRange } from "@flightplan/ui/lib/line-selection"
import SelectField from "@flightplan/ui/SelectField"
import TextEditor, { type CodeLinkRequest } from "@flightplan/ui/TextEditor"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface ModifyCardDialogProps {
  readonly reviewKey: ReviewKey
  readonly change: CardChange
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
}

type RowKind = CardForm["defaultKind"]

interface RowDraft extends LineRange {
  readonly key: string
  readonly id: string | null
  readonly type: RowKind
  readonly label: string
  readonly name: string
}

interface CardFieldsProps {
  readonly reviewKey: ReviewKey
  readonly form: CardForm
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onSave: (content: CardContent) => void
  readonly onClose: () => void
}

const FALLBACK_TITLE = "Modify a card"
const DESCRIPTION = "Write what the card says, and choose the rows it lists. Select lines in the code to add a row."
const LABEL_LABEL = "Label"
const DESCRIPTION_LABEL = "Description"
const ROWS_LABEL = "Rows"
const NO_ROWS_MESSAGE = "No rows yet. Select lines in the code, then choose Add row."
const KIND_LABEL = "Kind"
const ADD_ROW_LABEL = "Add row"

const inLineOrder = (rows: readonly RowDraft[]): RowDraft[] =>
  [...rows].sort((one, two) => one.lineStart - two.lineStart || one.lineEnd - two.lineEnd)

const toDraft = (row: CardForm["rows"][number]): RowDraft => ({ ...row, key: row.id })

const isRowKind = (form: CardForm, value: string): value is RowKind => form.kindOptions.some((option) => option.value === value)

const CardFields = ({ reviewKey, form, isSaving, errorMessage, renderCodeLinkDialog, onSave, onClose }: CardFieldsProps) => {
  const labelId = useId()
  const rowsId = useId()
  const [label, setLabel] = useState(form.label)
  const [description, setDescription] = useState(form.description)
  const [rows, setRows] = useState<readonly RowDraft[]>(() => inLineOrder(form.rows.map(toDraft)))
  const [focusedRange, setFocusedRange] = useState<LineRange | null>({ lineStart: form.lineStart, lineEnd: form.lineEnd })
  const fileCode = useFileCode(reviewKey, form.path)

  const changeRow = (key: string, change: Partial<Pick<RowDraft, "type" | "label">>) => {
    setRows((heldRows) => heldRows.map((row) => (row.key === key ? { ...row, ...change } : row)))
  }

  const handleAddRow = (range: LineRange) => {
    const added: RowDraft = { ...range, key: crypto.randomUUID(), id: null, type: form.defaultKind, label: "", name: rangeLabelOf(range) }
    setRows((heldRows) => inLineOrder([...heldRows, added]))
    setFocusedRange(range)
  }

  const handleSave = () => {
    onSave({
      label,
      description,
      rows: rows.map(({ id, type, label: rowLabel, lineStart, lineEnd }) => ({ id, type, label: rowLabel, lineStart, lineEnd })),
    })
  }

  return (
    <form action={handleSave} className="contents">
      <div className="grid min-h-0 grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <label htmlFor={labelId} className="text-sm font-bold">{LABEL_LABEL}</label>
            <Input id={labelId} value={label} placeholder={form.labelPlaceholder} onChange={(event) => { setLabel(event.target.value) }} />
          </div>
          <div className="grid gap-1.5">
            <p aria-hidden="true" className="text-sm font-bold">{DESCRIPTION_LABEL}</p>
            <TextEditor
              label={DESCRIPTION_LABEL}
              value={form.description}
              errorMessage={null}
              renderCodeLinkDialog={renderCodeLinkDialog}
              onChange={setDescription}
            />
          </div>
          <section aria-labelledby={rowsId} className="grid gap-2">
            <h3 id={rowsId} className="text-sm font-bold">{ROWS_LABEL}</h3>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">{NO_ROWS_MESSAGE}</p> : null}
            <ul className="grid gap-2">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="grid gap-1.5 rounded-md border border-input p-2"
                  onFocusCapture={() => { setFocusedRange({ lineStart: row.lineStart, lineEnd: row.lineEnd }) }}
                >
                  <div className="flex items-center gap-2">
                    <SelectField
                      label={`${KIND_LABEL} of ${row.name}`}
                      options={form.kindOptions}
                      value={row.type}
                      isLabelHidden
                      className="w-40 shrink-0"
                      onChange={(value) => { if (isRowKind(form, value)) changeRow(row.key, { type: value }) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums">{rangeLabelOf(row)}</span>
                    <IconButton
                      icon="delete"
                      label={`Delete the row ${row.label === "" ? row.name : row.label}`}
                      onClick={() => { setRows((heldRows) => heldRows.filter((heldRow) => heldRow.key !== row.key)) }}
                    />
                  </div>
                  <Input
                    value={row.label}
                    aria-label={`${LABEL_LABEL} of ${row.name}`}
                    placeholder={row.name}
                    onChange={(event) => { changeRow(row.key, { label: event.target.value }) }}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
        <CodeViewEditor
          path={form.path}
          lines={fileCode.lines}
          statusMessage={fileCode.statusMessage}
          waypoints={form.waypoints}
          waypointOptions="toggle-off"
          highlightButtonLabel={ADD_ROW_LABEL}
          focusOn={focusedRange}
          onHighlightCode={handleAddRow}
        />
      </div>
      {errorMessage === null ? <span /> : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  )
}

const ModifyCardDialog = ({ reviewKey, change: { segmentId, nodeId, isSaving, errorMessage, onSave, onClose }, renderCodeLinkDialog }: ModifyCardDialogProps) => {
  const { form, statusMessage } = useCardForm({ ...reviewKey, segmentId, nodeId })

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="h-[calc(100dvh-4rem)] grid-rows-[auto_minmax(0,1fr)_auto_auto] sm:max-w-[min(90rem,calc(100vw-4rem))]">
        <DialogHeader>
          <DialogTitle>{form?.title ?? FALLBACK_TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {form === null
          ? <p role="status" className="text-sm text-muted-foreground">{statusMessage}</p>
          : (
              <CardFields
                key={form.nodeId}
                reviewKey={reviewKey}
                form={form}
                isSaving={isSaving}
                errorMessage={errorMessage}
                renderCodeLinkDialog={renderCodeLinkDialog}
                onSave={onSave}
                onClose={onClose}
              />
            )}
      </DialogContent>
    </Dialog>
  )
}

export default ModifyCardDialog
