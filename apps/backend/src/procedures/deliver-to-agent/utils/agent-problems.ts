import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentName } from "@/procedures/get-setup/utils/setup"

const SCREEN_EXCERPT_LENGTH = 600
const MS_PER_SECOND = 1000
const WHITESPACE_PATTERN = /\s+/g

export const screenExcerptOf = (output: string): string =>
  output.replace(WHITESPACE_PATTERN, " ").trim().slice(-SCREEN_EXCERPT_LENGTH)

const withScreen = (sentence: string, output: string): string => {
  const excerpt = screenExcerptOf(output)
  return excerpt === "" ? sentence : `${sentence} Its terminal last showed: ${excerpt}`
}

export const unexpectedExitReason = (agent: AgentName, exitCode: number, output: string): string =>
  withScreen(`${AGENT_LABELS[agent]} stopped before it finished (exit code ${String(exitCode)}).`, output)

export const startTimeoutReason = (agent: AgentName, timeoutMs: number, output: string): string =>
  withScreen(
    `${AGENT_LABELS[agent]} did not start within ${String(Math.round(timeoutMs / MS_PER_SECOND))} seconds, so Flight Plan closed it.`,
    output,
  )
