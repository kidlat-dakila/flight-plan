import { useId, useState } from "react"
import { useFileCode } from "@/routes/pr-reviews/$repoName/-hooks/use-file-code"
import { useFileSearch } from "@/routes/pr-reviews/$repoName/-hooks/use-file-search"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import Input from "@flightplan/ui/blocks/input"
import CodeViewEditor from "@flightplan/ui/CodeViewEditor"
import FilePicker from "@flightplan/ui/FilePicker"
import { buildLinesCodeLink, type CodeLinkAttributes } from "@flightplan/ui/lib/code-link-node"
import { rangeLabelOf, type LineRange } from "@flightplan/ui/lib/line-selection"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface CodeLinkDialogProps {
  readonly reviewKey: ReviewKey
  readonly selectedText: string
  readonly onInsert: (codeLink: CodeLinkAttributes) => void
  readonly onClose: () => void
}

const TITLE = "Link to code"
const DESCRIPTION = "Pick a file of the Flight Plan, select the lines the link points at, and name the link."
const FILE_LABEL = "File"
const FILE_PLACEHOLDER = "Search the files of the Flight Plan"
const LINK_LINES_LABEL = "Link these lines"
const NO_LINES_MESSAGE = "Select the lines in the code: click a line number, then another with Shift."
const LABEL_LABEL = "Label"
const CODE_LABEL = "Show the label as code"
const INVALID_LABEL_MESSAGE = "Write a label without a backtick or a closing square bracket."

const CodeLinkDialog = ({ reviewKey, selectedText, onInsert, onClose }: CodeLinkDialogProps) => {
  const labelId = useId()
  const fileSearch = useFileSearch(reviewKey, "flight-plan")
  const [path, setPath] = useState<string | null>(null)
  const [range, setRange] = useState<LineRange | null>(null)
  const [label, setLabel] = useState(selectedText)
  const [isCode, setIsCode] = useState(false)
  const fileCode = useFileCode(reviewKey, path)
  const codeLink = path === null || range === null ? null : buildLinesCodeLink({ path, range, label, isCode })
  const hasInvalidLabel = path !== null && range !== null && label.trim() !== "" && codeLink === null

  const handleSelectFile = (selectedPath: string) => {
    setPath(selectedPath)
    setRange(null)
    fileSearch.onQueryChange(selectedPath)
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="h-[calc(100dvh-4rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] sm:max-w-[min(90rem,calc(100vw-4rem))]">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <FilePicker
          label={FILE_LABEL}
          hint={null}
          placeholder={FILE_PLACEHOLDER}
          query={fileSearch.query}
          files={fileSearch.files}
          message={fileSearch.message}
          errorMessage={fileSearch.errorMessage}
          onTroubleshoot={fileSearch.onTroubleshoot}
          onQueryChange={fileSearch.onQueryChange}
          onSelect={handleSelectFile}
        />
        {path === null
          ? <span />
          : (
              <div className="flex min-h-0 flex-col gap-2">
                <CodeViewEditor
                  path={path}
                  lines={fileCode.lines}
                  statusMessage={fileCode.statusMessage}
                  waypoints={[]}
                  waypointOptions="always-off"
                  highlightButtonLabel={LINK_LINES_LABEL}
                  focusOn={range}
                  className="flex-1"
                  onHighlightCode={setRange}
                />
                <p role="status" className="text-sm text-muted-foreground">{range === null ? NO_LINES_MESSAGE : rangeLabelOf(range)}</p>
              </div>
            )}
        <div className="grid gap-1.5">
          <label htmlFor={labelId} className="text-sm font-bold">{LABEL_LABEL}</label>
          <Input
            id={labelId}
            value={label}
            aria-invalid={hasInvalidLabel}
            onChange={(event) => { setLabel(event.target.value) }}
          />
          {hasInvalidLabel ? <p role="alert" className="text-sm text-destructive">{INVALID_LABEL_MESSAGE}</p> : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCode} className="size-4 accent-(--primary)" onChange={(event) => { setIsCode(event.target.checked) }} />
            {CODE_LABEL}
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={codeLink === null} onClick={() => { if (codeLink !== null) onInsert(codeLink) }}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CodeLinkDialog
