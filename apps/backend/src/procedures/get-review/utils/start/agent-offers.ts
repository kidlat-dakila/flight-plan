import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { offeredEffortOf, offerModels, type AgentModels, type ModelOffer } from "@/procedures/get-setup/utils/agent-models"
import type { AgentInstall, AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"

export interface AgentOffer {
  readonly agent: AgentName
  readonly label: string
  readonly isStartable: boolean
  readonly models: readonly ModelOffer[]
  readonly model: string
  readonly effort: string
  readonly preferredEffort: string
}

export const NO_AGENT_WRITER = "none"

export type WriterKey = AgentName | typeof NO_AGENT_WRITER

const toAgentOffer = (install: AgentInstall, startableAgents: readonly AgentName[], agentModels: AgentModels): AgentOffer => {
  const models = offerModels(install.agent, agentModels, install.model)
  return {
    agent: install.agent,
    label: AGENT_LABELS[install.agent],
    isStartable: startableAgents.includes(install.agent),
    models,
    model: install.model,
    effort: offeredEffortOf(models.find((offer) => offer.model === install.model), install.effort),
    preferredEffort: install.effort,
  }
}

export const offerAgents = (
  agents: AgentsChoice | null,
  startableAgents: readonly AgentName[],
  agentModels: AgentModels,
): readonly AgentOffer[] =>
  (agents?.installs ?? []).map((install) => toAgentOffer(install, startableAgents, agentModels))

export const defaultWriterKeyOf = (agents: AgentsChoice | null, offers: readonly AgentOffer[]): WriterKey => {
  const preferred = offers.find((offer) => offer.agent === agents?.defaultAgent) ?? offers.at(0)
  return preferred?.agent ?? NO_AGENT_WRITER
}
