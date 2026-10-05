import {
  AGENT_EFFORTS,
  AGENT_LABELS,
  AGENT_MODELS,
  type EffortOffer,
  type ModelOffer,
} from "@/procedures/get-setup/utils/agent-catalog"
import { DEFAULT_EFFORT, type AgentName, type AgentsChoice } from "@/procedures/get-setup/utils/setup"

export interface AgentOffer {
  readonly agent: AgentName
  readonly label: string
  readonly unavailableReason: string | null
  readonly models: readonly ModelOffer[]
  readonly model: string
  readonly efforts: readonly EffortOffer[]
  readonly effort: string
}

export const MANUAL_WRITER = "manual"

export type WriterKey = AgentName | typeof MANUAL_WRITER

const unstartableReason = (label: string): string =>
  `Flight Plan cannot start ${label} yet. Prompt it yourself instead.`

export const offerAgents = (agents: AgentsChoice | null, startableAgents: readonly AgentName[]): readonly AgentOffer[] =>
  (agents?.installs ?? []).map((install) => ({
    agent: install.agent,
    label: AGENT_LABELS[install.agent],
    unavailableReason: startableAgents.includes(install.agent) ? null : unstartableReason(AGENT_LABELS[install.agent]),
    models: AGENT_MODELS[install.agent],
    model: install.model,
    efforts: AGENT_EFFORTS[install.agent],
    effort: DEFAULT_EFFORT,
  }))

const isAvailable = (offer: AgentOffer): boolean => offer.unavailableReason === null

export const defaultWriterKeyOf = (agents: AgentsChoice | null, offers: readonly AgentOffer[]): WriterKey => {
  if (agents?.connection !== "direct") return MANUAL_WRITER
  const available = offers.filter(isAvailable)
  const preferred = available.find((offer) => offer.agent === agents.defaultAgent) ?? available.find(isAvailable)
  return preferred?.agent ?? MANUAL_WRITER
}

export const effortLabelOf = (agent: AgentName, effort: string): string | null =>
  effort === DEFAULT_EFFORT ? null : AGENT_EFFORTS[agent].find((offer) => offer.effort === effort)?.label ?? effort

export const modelLabelOf = (agent: AgentName, model: string): string =>
  AGENT_MODELS[agent].find((offer) => offer.model === model)?.label ?? model
