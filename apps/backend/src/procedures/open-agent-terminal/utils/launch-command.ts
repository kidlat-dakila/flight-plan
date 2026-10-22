import { listenPermissionRuleOf } from "@/procedures/get-conversation/utils/agent-text"
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "@/procedures/get-setup/utils/setup"
import { PLUGIN_NAME } from "@/procedures/save-setup-step/utils/claude-plugin"
import { MCP_SERVER_NAME } from "@/procedures/save-setup-step/utils/flightplan-server"

export const FLIGHT_PLAN_TOOLS_RULE = `mcp__plugin_${PLUGIN_NAME}_${MCP_SERVER_NAME}__*`

const CLAUDE_EXECUTABLE = "claude"
const SINGLE_QUOTE = "'"
const ESCAPED_SINGLE_QUOTE = String.raw`'\''`

export interface LiveLaunch {
  readonly workingPath: string
  readonly prompt: string
  readonly model: string
  readonly effort: string
  readonly serverUrl: string
}

export const quoteForShell = (text: string): string =>
  `${SINGLE_QUOTE}${text.replaceAll(SINGLE_QUOTE, ESCAPED_SINGLE_QUOTE)}${SINGLE_QUOTE}`

export const claudeLiveArguments = (launch: LiveLaunch): readonly string[] => [
  launch.prompt,
  ...(launch.model === DEFAULT_MODEL ? [] : ["--model", launch.model]),
  ...(launch.effort === DEFAULT_EFFORT ? [] : ["--effort", launch.effort]),
  "--allowedTools",
  FLIGHT_PLAN_TOOLS_RULE,
  listenPermissionRuleOf(launch.serverUrl),
]

export const buildLaunchCommand = (launch: LiveLaunch): string =>
  [
    `cd ${quoteForShell(launch.workingPath)}`,
    [CLAUDE_EXECUTABLE, ...claudeLiveArguments(launch).map(quoteForShell)].join(" "),
  ].join(" && ")
