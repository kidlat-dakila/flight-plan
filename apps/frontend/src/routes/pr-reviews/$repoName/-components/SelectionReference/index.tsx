import AgentMark from "@flightplan/ui/AgentMark"
import Button from "@flightplan/ui/blocks/button"
import type { Excerpt } from "@flightplan/ui/ChatPanel"
import type { CommentRange } from "@flightplan/ui/FileRows"
import type { ArtifactPart } from "@flightplan/ui/lib/artifact-part"
import type { WriteUpAgent } from "@flightplan/ui/lib/write-up-agent"

interface SelectionPlace {
  readonly excerpt: Excerpt
  readonly left: number
  readonly top: number
}

export interface CodeSelection extends SelectionPlace {
  readonly kind: "code"
  readonly path: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly commentRange: CommentRange | null
}

export interface PartSelection extends SelectionPlace {
  readonly kind: "text"
  readonly part: ArtifactPart
}

export type TextSelection = CodeSelection | PartSelection

interface SelectionReferenceProps {
  readonly selection: TextSelection | null
  readonly agent: WriteUpAgent | null
  readonly onComment: (path: string, range: CommentRange) => void
  readonly onAsk: ((selection: TextSelection) => void) | null
}

const UNKNOWN_AGENT_ASK_LABEL = "Ask the agent"
const TOOLBAR_LABELS: Record<TextSelection["kind"], string> = { code: "Selected code", text: "Selected text" }

const commentRangeOf = (selection: TextSelection): CommentRange | null => (selection.kind === "code" ? selection.commentRange : null)

const askLabelOf = (agent: WriteUpAgent | null): string => (agent === null ? UNKNOWN_AGENT_ASK_LABEL : `Ask ${agent.label}`)

const SelectionReference = ({ selection, agent, onComment, onAsk }: SelectionReferenceProps) => {
  if (selection === null) return null
  const commentRange = commentRangeOf(selection)
  if (commentRange === null && onAsk === null) return null
  return (
    <div
      role="toolbar"
      aria-label={TOOLBAR_LABELS[selection.kind]}
      className="fixed z-50 flex -translate-y-full gap-0.5 rounded-lg border border-foreground bg-popover p-1 duration-150 animate-in fade-in-0"
      style={{ left: selection.left, top: selection.top }}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
    >
      {commentRange === null || selection.kind !== "code"
        ? null
        : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onComment(selection.path, commentRange)
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
              {agent === null ? null : <AgentMark agent={agent.name} />}
              {askLabelOf(agent)}
            </Button>
          )}
    </div>
  )
}

export default SelectionReference
