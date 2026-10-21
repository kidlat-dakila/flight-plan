import { use } from "react"
import GuideTooltip, { KeyedText } from "@/components/GuideTooltip"
import { useGuideTracking } from "@/lib/guide-tooltips/hooks"
import type { ReviewMode } from "@/lib/guide-tooltips/triggers"
import { NavigatorContext } from "@/lib/navigator"
import { controlOfKey, WRITE_UP_KEY } from "@/lib/navigator-controls"
import { EXPLAIN_CODE_BLOCK_ACTION_ID, EXPLAIN_WAYPOINT_ACTION_ID } from "@/lib/walkthrough-navigation"
import { WriteUpAgentContext } from "@/lib/write-up-agent"

interface ReviewGuideTooltipsProps {
  readonly reviewMode: ReviewMode
}

const FALLBACK_AGENT_LABEL = "the agent"
const STEPPING_ACTION_IDS = ["next-waypoint-action", "previous-waypoint-action"]
const FILTER_STEP_COUNT = 5
const NAVIGATOR_TOOLBAR = "[role='toolbar']"

const actionSelectorOf = (actionId: string): string => `[data-user-action-id="${actionId}"]`

const navigatorActionSelectorOf = (actionId: string): string => `${NAVIGATOR_TOOLBAR} ${actionSelectorOf(actionId)}`

const ReviewGuideTooltips = ({ reviewMode }: ReviewGuideTooltipsProps) => {
  useGuideTracking(reviewMode)
  const navigator = use(NavigatorContext)
  const agent = use(WriteUpAgentContext)
  const agentLabel = agent?.label ?? FALLBACK_AGENT_LABEL
  const isWaypointMissingDescription = navigator !== null && controlOfKey(navigator.groups, WRITE_UP_KEY) !== null
  return (
    <>
      <GuideTooltip
        id="jump-to-action-tooltip"
        title="Jump to any section"
        content={<KeyedText parts={["Press ", { keycap: "W" }, " to see every section of this review and go straight to one."]} />}
        anchorSelector={actionSelectorOf("jump-to-action")}
        triggers={{ viewVisible: ["context-section"], preFeatureUse: ["jump-to-action"] }}
      />
      <GuideTooltip
        id="change-overview-card-tooltip"
        title="Each card is a changed code block"
        content="Hover a card to see its code. Press it to read that code in the Code Walkthrough."
        anchorSelector={actionSelectorOf("change-overview-card-action")}
        triggers={{
          viewVisible: ["change-overview-section"],
          preFeatureUse: { actionIds: ["change-overview-card-action"], use: "click-or-hover" },
          dayBound: 1,
        }}
      />
      <GuideTooltip
        id="trace-diagram-card-tooltip"
        title="Open a card to read its code"
        content="Press a card to see its code beside the diagram, with what it does in this change."
        anchorSelector={`${actionSelectorOf("trace-diagram-card-action")}[data-change]`}
        triggers={{ viewVisible: ["trace-diagram-section"], preFeatureUse: ["trace-diagram-card-action"] }}
      />
      <GuideTooltip
        id="blast-diagram-card-tooltip"
        title="See how a file is affected"
        content="Press a file to see what the change does to it and why."
        anchorSelector={`${actionSelectorOf("blast-diagram-card-action")}[data-mark="added"], ${actionSelectorOf("blast-diagram-card-action")}[data-mark="modified"]`}
        triggers={{
          viewVisible: ["blast-diagram-section"],
          preFeatureUse: ["blast-diagram-card-action"],
          postFeatureUse: ["trace-diagram-card-action"],
        }}
      />
      <GuideTooltip
        id="code-view-rail-tooltip"
        title="Marks show the lines to read"
        content="Hover a mark beside the code to preview its waypoint. Press the mark to open it."
        anchorSelector={actionSelectorOf("waypoint-mark-action")}
        side="right"
        triggers={{
          viewVisible: ["code-walkthrough-section"],
          preFeatureUse: { actionIds: ["waypoint-mark-action"], use: "click-or-hover" },
        }}
      />
      <GuideTooltip
        id="generate-agent-writing"
        title={`Let ${agentLabel} explain this line`}
        content={<KeyedText parts={["This waypoint has no explanation yet. Press ", { keycap: "G" }, ` and ${agentLabel} writes one for you.`]} />}
        anchorSelector={navigatorActionSelectorOf(EXPLAIN_WAYPOINT_ACTION_ID)}
        triggers={{
          viewVisible: ["waypoint-card-section", "waypoint-box-section"],
          preFeatureUse: [EXPLAIN_WAYPOINT_ACTION_ID, EXPLAIN_CODE_BLOCK_ACTION_ID],
          dependsOnValues: { isWaypointMissingDescription },
        }}
      />
      <GuideTooltip
        id="next-waypoint-tooltip"
        title="Step through the waypoints"
        content={<KeyedText parts={["Press ", { keycap: "D" }, " for the next waypoint and ", { keycap: "A" }, " for the one before."]} />}
        anchorSelector={navigatorActionSelectorOf("next-waypoint-action")}
        triggers={{
          viewVisible: ["code-walkthrough-section"],
          preFeatureUse: STEPPING_ACTION_IDS,
          postFeatureUse: { actionIds: ["waypoint-mark-action"], use: "click-or-hover" },
        }}
      />
      <GuideTooltip
        id="filter-waypoint-tooltip"
        title="Filter the waypoints"
        content={<KeyedText parts={["Press ", { keycap: "F" }, " to show only the waypoints with a finding, a Core change or your Spotlight."]} />}
        anchorSelector={navigatorActionSelectorOf("filter-action")}
        triggers={{
          viewVisible: ["code-walkthrough-section"],
          tooltipDependent: ["next-waypoint-tooltip"],
          preFeatureUse: ["filter-action"],
          postFeatureUse: { actionIds: STEPPING_ACTION_IDS, times: FILTER_STEP_COUNT },
        }}
      />
    </>
  )
}

export default ReviewGuideTooltips
