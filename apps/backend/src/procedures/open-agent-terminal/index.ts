import type { ProcedureContext } from "@/procedures/context"
import { liveCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import { latestModelChoiceOf } from "@/procedures/get-conversation/utils/conversation"
import { findReviewTarget } from "@/procedures/get-conversation/utils/conversation-actions"
import { chooseInstall, chooseWriter } from "@/procedures/get-model-choice/utils/choose-writer"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { terminalAppOf } from "@/procedures/get-setup/utils/setup"
import { buildLaunchCommand } from "./utils/launch-command"
import type { AgentTerminalOpening, OpenAgentTerminalInput } from "./utils/schemas"
import { failedOpeningMessageOf, terminalPlaceOf, withTabAccessHint } from "./utils/terminal-messages"

const NO_TERMINAL_MESSAGE = "Flight Plan can open a terminal on macOS only. Copy the command and run it yourself."
const NO_LIVE_AGENT_MESSAGE = "Flight Plan can start only Claude in a terminal. Copy the command and run it yourself."

const TERMINAL_SOURCE = "Agent terminal"

const rejected = (message: string): AgentTerminalOpening => ({ kind: "rejected", message })

export const openAgentTerminal = async (input: OpenAgentTerminalInput, context: ProcedureContext): Promise<AgentTerminalOpening> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const { openTerminal } = context
  if (openTerminal === null) return rejected(NO_TERMINAL_MESSAGE)
  const [target, setup, conversation, request] = await Promise.all([
    findReviewTarget(key, context),
    context.setupStore.read(),
    context.conversationEnvironment.store.read(key),
    context.reviewStore.findRequest(key),
  ])
  if (target.kind === "rejected") return target
  const install = setup.agents === null ? null : chooseInstall(setup.agents, LIVE_AGENTS)
  if (install === null) return rejected(NO_LIVE_AGENT_MESSAGE)
  const writer = chooseWriter(install, request, latestModelChoiceOf(conversation.journal, install.agent))
  const terminalApp = terminalAppOf(setup)
  const opening = await openTerminal(buildLaunchCommand({
    workingPath: target.workingPath,
    prompt: liveCommandOf(key),
    model: writer.install.model,
    effort: writer.effort,
    serverUrl: context.conversationEnvironment.serverUrl,
  }), terminalApp)
  if (opening.kind === "failed") {
    await context.errorLog.record({ source: TERMINAL_SOURCE, message: opening.reason, stack: null }).saving
    return rejected(failedOpeningMessageOf(terminalApp, opening.reason))
  }
  if (opening.tab !== null) context.conversationEnvironment.agentTerminals.remember(key, opening.tab)
  const startingMessage = `${AGENT_LABELS[install.agent]} is starting in ${terminalPlaceOf(terminalApp, opening.isWindowFallback)}.`
  return { kind: "opened", message: withTabAccessHint(startingMessage, opening.isWindowFallback) }
}
