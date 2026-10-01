import Button from "@flightplan/ui/blocks/button"

export interface CodeSelection {
  readonly path: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly left: number
  readonly top: number
}

interface SelectionReferenceProps {
  readonly selection: CodeSelection | null
  readonly onCopy: (selection: CodeSelection) => void
  readonly onAsk: (selection: CodeSelection) => void
}

const SelectionReference = ({ selection, onCopy, onAsk }: SelectionReferenceProps) => (selection === null
  ? null
  : (
      <div
        role="toolbar"
        aria-label="Selected code"
        className="fixed z-50 flex -translate-y-full gap-0.5 rounded-lg border border-foreground bg-popover p-1 duration-150 animate-in fade-in-0"
        style={{ left: selection.left, top: selection.top }}
        onMouseDown={(event) => {
          event.preventDefault()
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onCopy(selection)
          }}
        >
          Copy reference
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onAsk(selection)
          }}
        >
          Ask the agent
        </Button>
      </div>
    ))

export default SelectionReference
