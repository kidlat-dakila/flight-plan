import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { offeredEffortOf, offerModels, type AgentModels, type ModelOffer } from "@/procedures/get-setup/utils/agent-models"
import type { AgentInstall, AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"

export interface AgentOffer {
  readonly agent: AgentName
  readonly label: string
  readonly unavailableReason: string | null
  readonly models: readonly ModelOffer[]
  readonly model: string
  readonly effort: string
  readonly preferredEffort: string
}

export const MANUAL_WRITER = "manual"

export type WriterKey = AgentName | typeof MANUAL_WRITER

const unstartableReason = (label: string): string =>
  `Flight Plan cannot start ${label} yet. Prompt it yourself instead.`

const toAgentOffer = (install: AgentInstall, startableAgents: readonly AgentName[], agentModels: AgentModels): AgentOffer => {
  const models = offerModels(install.agent, agentModels, install.model)
  return {
    agent: install.agent,
    label: AGENT_LABELS[install.agent],
    unavailableReason: startableAgents.includes(install.agent) ? null : unstartableReason(AGENT_LABELS[install.agent]),
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

const isAvailable = (offer: AgentOffer): boolean => offer.unavailableReason === null

export const defaultWriterKeyOf = (agents: AgentsChoice | null, offers: readonly AgentOffer[]): WriterKey => {
  if (agents?.connection !== "direct") return MANUAL_WRITER
  const available = offers.filter(isAvailable)
  const preferred = available.find((offer) => offer.agent === agents.defaultAgent) ?? available.find(isAvailable)
  return preferred?.agent ?? MANUAL_WRITER
}
