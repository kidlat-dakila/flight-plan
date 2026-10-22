import type { ModelChoice } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { AgentInstall, AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"

export interface ChosenWriter {
  readonly install: AgentInstall
  readonly effort: string
}

const writerOfRequest = (install: AgentInstall, request: ReviewRequest | null): ChosenWriter =>
  request?.writer.kind === "agent" && request.writer.agent === install.agent
    ? { install: { ...install, model: request.writer.model }, effort: request.writer.effort }
    : { install, effort: install.effort }

export const chooseWriter = (
  install: AgentInstall,
  request: ReviewRequest | null,
  modelChoice: ModelChoice | null,
): ChosenWriter =>
  modelChoice?.agent === install.agent
    ? { install: { ...install, model: modelChoice.model }, effort: modelChoice.effort }
    : writerOfRequest(install, request)

export const chooseInstall = (agents: AgentsChoice, liveAgents: readonly AgentName[]): AgentInstall | null => {
  const candidates = agents.installs.filter((install) => liveAgents.includes(install.agent))
  return candidates.find((install) => install.agent === agents.defaultAgent) ?? candidates.at(0) ?? null
}
