import { DEFAULT_EFFORT, DEFAULT_MODEL } from "@/procedures/get-setup/utils/setup"
import { FLIGHT_PLAN_TOOLS_RULE, quoteForShell } from "@/procedures/open-agent-terminal/utils/launch-command"

export const TROUBLESHOOT_SKILL_COMMAND = "/flightplan:troubleshoot"
export const DOCS_FETCH_RULES = ["WebFetch(domain:github.com)", "WebFetch(domain:raw.githubusercontent.com)"] as const

const CLAUDE_EXECUTABLE = "claude"

export interface TroubleshootLaunch {
  readonly workingPath: string
  readonly requestId: string
  readonly model: string
  readonly effort: string
}

export const troubleshootPromptOf = (requestId: string): string => `${TROUBLESHOOT_SKILL_COMMAND} ${requestId}`

export const claudeTroubleshootArguments = (launch: TroubleshootLaunch): readonly string[] => [
  troubleshootPromptOf(launch.requestId),
  ...(launch.model === DEFAULT_MODEL ? [] : ["--model", launch.model]),
  ...(launch.effort === DEFAULT_EFFORT ? [] : ["--effort", launch.effort]),
  "--allowedTools",
  FLIGHT_PLAN_TOOLS_RULE,
  ...DOCS_FETCH_RULES,
]

export const buildTroubleshootCommand = (launch: TroubleshootLaunch): string =>
  [
    `cd ${quoteForShell(launch.workingPath)}`,
    [CLAUDE_EXECUTABLE, ...claudeTroubleshootArguments(launch).map(quoteForShell)].join(" "),
  ].join(" && ")
