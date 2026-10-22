import { use } from "react"
import AgentMark from "@/components/AgentMark"
import { BeingWrittenLines, KeycapButton, NoWriteUpTag } from "@/components/WriteUpIcon"
import { WRITE_UP_KEY } from "@/lib/navigator-controls"
import { cn } from "@/lib/utils"
import { COMMENT_KEY, EXPLAIN_CODE_BLOCK_ACTION_ID, EXPLAIN_WAYPOINT_ACTION_ID, WRITE_DESCRIPTION_LABEL } from "@/lib/walkthrough-navigation"
import { WriteUpAgentContext, type WriteUpAgent } from "@/lib/write-up-agent"

export interface WaypointWriteUp {
  readonly onLine: () => void
  readonly onBlock: (() => void) | null
}

interface MissingWriteUpProps {
  readonly hint: string | null
  readonly isBeingWritten: boolean
  readonly isAuthored: boolean
  readonly className?: string
}

interface WriteUpButtonsProps {
  readonly isBeingWritten: boolean
  readonly writeUp: WaypointWriteUp | null
  readonly onWriteDescription: (() => void) | null
}

const UNEXPLAINED_LABEL = "This line of code is not explained or checked for issues yet."
const UNDESCRIBED_LABEL = "This waypoint does not have any description or explanation."
const EXPLAIN_LINE_LABEL = "Explain this line"
const EXPLAIN_BLOCK_LABEL = "Explain the whole code block"
const CONTROL_KEY_LABEL = "Ctrl+G"

const unexplainedLabelOf = (agent: WriteUpAgent | null): string =>
  agent === null ? UNEXPLAINED_LABEL : `${agent.label} has not explained this line of code or checked it for issues yet.`

const explainingLabelOf = (agent: WriteUpAgent | null): string => `${agent?.label ?? "The agent"} is explaining this line.`

const explainLabelOf = (agent: WriteUpAgent | null): string => (agent === null ? EXPLAIN_LINE_LABEL : `Let ${agent.label} explain`)

const ExplainButtons = ({ writeUp }: { readonly writeUp: WaypointWriteUp }) => {
  const agent = use(WriteUpAgentContext)
  return (
    <>
      <KeycapButton
        label={explainLabelOf(agent)}
        keyLabel={WRITE_UP_KEY}
        icon={agent === null ? null : <AgentMark agent={agent.name} />}
        actionId={EXPLAIN_WAYPOINT_ACTION_ID}
        onClick={writeUp.onLine}
      />
      {writeUp.onBlock === null ? null : <KeycapButton label={EXPLAIN_BLOCK_LABEL} keyLabel={CONTROL_KEY_LABEL} actionId={EXPLAIN_CODE_BLOCK_ACTION_ID} onClick={writeUp.onBlock} />}
    </>
  )
}

export const WriteUpButtons = ({ isBeingWritten, writeUp, onWriteDescription }: WriteUpButtonsProps) =>
  isBeingWritten
    ? null
    : (
        <>
          {writeUp === null ? null : <ExplainButtons writeUp={writeUp} />}
          {onWriteDescription === null
            ? null
            : <KeycapButton label={WRITE_DESCRIPTION_LABEL} keyLabel={COMMENT_KEY} actionId="write-description-action" onClick={onWriteDescription} />}
        </>
      )

const MissingWriteUp = ({ hint, isBeingWritten, isAuthored, className }: MissingWriteUpProps) => {
  const agent = use(WriteUpAgentContext)
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {hint === null ? null : <p className="text-sm text-foreground">{hint}</p>}
      {isBeingWritten
        ? <BeingWrittenLines label={explainingLabelOf(agent)} />
        : <NoWriteUpTag label={isAuthored ? UNDESCRIBED_LABEL : unexplainedLabelOf(agent)} />}
    </div>
  )
}

export default MissingWriteUp
