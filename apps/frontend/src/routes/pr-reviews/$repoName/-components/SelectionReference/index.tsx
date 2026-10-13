import Button from "@flightplan/ui/blocks/button"
import type { CommentRange } from "@flightplan/ui/FileSection"

export interface CodeSelection {
  readonly path: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly commentRange: CommentRange | null
  readonly left: number
  readonly top: number
}

interface SelectionReferenceProps {
  readonly selection: CodeSelection | null
  readonly onComment: (path: string, range: CommentRange) => void
  readonly onAsk: ((selection: CodeSelection) => void) | null
}

const SelectionReference = ({ selection, onComment, onAsk }: SelectionReferenceProps) => (selection === null
  || (selection.commentRange === null && onAsk === null)
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
        {selection.commentRange === null
          ? null
          : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selection.commentRange !== null) onComment(selection.path, selection.commentRange)
                }}
              >
                Add comment
              </Button>
            )}
        {onAsk === null
          ? null
          : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAsk(selection)
                }}
              >
                Ask the agent
              </Button>
            )}
      </div>
    ))

export default SelectionReference
