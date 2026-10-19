import { useState } from "react"
import { useCardBlocks } from "@/routes/pr-reviews/$repoName/-hooks/use-card-blocks"
import { useFileCode } from "@/routes/pr-reviews/$repoName/-hooks/use-file-code"
import { useFileSearch } from "@/routes/pr-reviews/$repoName/-hooks/use-file-search"
import type { CardAddition, NewCard } from "@/routes/pr-reviews/$repoName/-hooks/use-trace-editing"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import CodeViewEditor from "@flightplan/ui/CodeViewEditor"
import FilePicker from "@flightplan/ui/FilePicker"
import { rangeLabelOf, type LineRange } from "@flightplan/ui/lib/line-selection"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface AddCardDialogProps {
  readonly reviewKey: ReviewKey
  readonly addition: CardAddition
}

type CardSource = NewCard["source"]

const TITLE = "Add a card"
const DESCRIPTION = "Pick a file, then the code the card stands for: one of its code blocks, or the lines you select in the code."
const FILE_LABEL = "File"
const FILE_PLACEHOLDER = "Search the files of the repository"
const BLOCKS_LABEL = "Code blocks"
const USE_LINES_LABEL = "Use these lines"
const NO_CODE_MESSAGE = "Pick a code block on the left, or select lines in the code: click a line number, then another with Shift."
const PREFILL_LABEL = "Prefill the rows of the card from the code"
const SUBMIT_LABEL = "Add card"
const SAVING_LABEL = "Adding…"
const CHECKBOX_CLASSES = "size-4 accent-(--primary)"
const BLOCK_CLASSES = "flex w-full flex-col rounded-md border border-input px-2.5 py-1.5 text-left transition-colors duration-[180ms] ease-out hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-accent"

const AddCardDialog = ({ reviewKey, addition: { segmentId, note, isSaving, errorMessage, onSubmit, onClose } }: AddCardDialogProps) => {
  const fileSearch = useFileSearch(reviewKey, "repository")
  const [path, setPath] = useState<string | null>(null)
  const [source, setSource] = useState<CardSource | null>(null)
  const [isPrefilled, setIsPrefilled] = useState(true)
  const [hasChildComponents, setHasChildComponents] = useState(false)
  const fileCode = useFileCode(reviewKey, path)
  const { blocks, message: blocksMessage } = useCardBlocks({ ...reviewKey, segmentId }, path)
  const pickedBlock = source?.kind === "block" ? blocks.find((block) => block.id === source.blockId) ?? null : null
  const pickedRange: LineRange | null = source?.kind === "lines" ? source : pickedBlock

  const handleSelectFile = (selectedPath: string) => {
    setPath(selectedPath)
    setSource(null)
    setHasChildComponents(false)
    fileSearch.onQueryChange(selectedPath)
  }

  const handleSubmit = () => {
    if (path === null || source === null) return
    onSubmit({ path, source, isPrefilled, hasChildComponents: hasChildComponents && pickedBlock?.childComponentsLabel != null })
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="h-[calc(100dvh-4rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] sm:max-w-[min(90rem,calc(100vw-4rem))]">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{note === null ? DESCRIPTION : `${DESCRIPTION} ${note}`}</DialogDescription>
        </DialogHeader>
        <FilePicker
          label={FILE_LABEL}
          hint={null}
          placeholder={FILE_PLACEHOLDER}
          query={fileSearch.query}
          files={fileSearch.files}
          message={fileSearch.message}
          errorMessage={fileSearch.errorMessage}
          onQueryChange={fileSearch.onQueryChange}
          onSelect={handleSelectFile}
        />
        {path === null
          ? <span />
          : (
              <div className="grid min-h-0 grid-cols-[16rem_minmax(0,1fr)] gap-3">
                <section aria-label={BLOCKS_LABEL} className="flex min-h-0 flex-col gap-2">
                  <h3 className="text-sm font-bold">{BLOCKS_LABEL}</h3>
                  {blocksMessage === null ? null : <p role="status" className="text-sm text-muted-foreground">{blocksMessage}</p>}
                  <ul className="grid min-h-0 content-start gap-1 overflow-y-auto">
                    {blocks.map((block) => (
                      <li key={block.id}>
                        <button
                          type="button"
                          aria-pressed={pickedBlock?.id === block.id}
                          disabled={block.heldLabel !== null}
                          className={BLOCK_CLASSES}
                          onClick={() => { setSource({ kind: "block", blockId: block.id }) }}
                        >
                          <span className="truncate font-mono text-[0.8125rem] font-bold" title={block.name}>{block.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{block.heldLabel ?? block.detail}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                <div className="flex min-h-0 flex-col gap-2">
                  <CodeViewEditor
                    path={path}
                    lines={fileCode.lines}
                    statusMessage={fileCode.statusMessage}
                    waypoints={[]}
                    waypointOptions="always-off"
                    highlightButtonLabel={USE_LINES_LABEL}
                    focusOn={pickedRange}
                    className="flex-1"
                    onHighlightCode={(range) => { setSource({ kind: "lines", ...range }) }}
                  />
                  <p role="status" className="text-sm text-muted-foreground">
                    {pickedRange === null ? NO_CODE_MESSAGE : [pickedBlock?.name ?? null, rangeLabelOf(pickedRange)].filter((part) => part !== null).join(", ")}
                  </p>
                </div>
              </div>
            )}
        <div className="grid gap-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrefilled} className={CHECKBOX_CLASSES} onChange={(event) => { setIsPrefilled(event.target.checked) }} />
            {PREFILL_LABEL}
          </label>
          {pickedBlock?.childComponentsLabel == null
            ? null
            : (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasChildComponents}
                    className={CHECKBOX_CLASSES}
                    onChange={(event) => { setHasChildComponents(event.target.checked) }}
                  />
                  {pickedBlock.childComponentsLabel}
                </label>
              )}
          {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={path === null || source === null || isSaving} onClick={handleSubmit}>{isSaving ? SAVING_LABEL : SUBMIT_LABEL}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddCardDialog
