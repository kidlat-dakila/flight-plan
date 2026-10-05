import { DEFAULT_EFFORT, DEFAULT_MODEL, type AgentName, type AgentsChoice } from "./setup"

export interface ListedModel {
  readonly model: string
  readonly label: string
  readonly efforts: readonly string[]
}

export type AgentModels = Readonly<Partial<Record<AgentName, readonly ListedModel[]>>>

export interface EffortOffer {
  readonly effort: string
  readonly label: string
}

export interface ModelOffer {
  readonly model: string
  readonly label: string
  readonly efforts: readonly EffortOffer[]
}

const DEFAULT_EFFORT_OFFER: EffortOffer = { effort: DEFAULT_EFFORT, label: "Default" }

const EFFORT_LABELS: Readonly<Record<string, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
}

const UNLISTED_MODELS: Record<AgentName, ListedModel> = {
  claude: { model: DEFAULT_MODEL, label: "Your Claude default", efforts: ["low", "medium", "high", "max"] },
  codex: { model: DEFAULT_MODEL, label: "Your Codex default", efforts: [] },
  cursor: { model: DEFAULT_MODEL, label: "Your Cursor default", efforts: [] },
}

const toEffortOffer = (effort: string): EffortOffer => ({ effort, label: EFFORT_LABELS[effort] ?? effort })

const toModelOffer = (listed: ListedModel): ModelOffer => ({
  model: listed.model,
  label: listed.label,
  efforts: [DEFAULT_EFFORT_OFFER, ...listed.efforts.map(toEffortOffer)],
})

const savedModelsMissingFrom = (
  models: readonly ListedModel[],
  savedModel: string | null,
  efforts: readonly string[],
): readonly ListedModel[] => {
  if (savedModel === null || models.some((listed) => listed.model === savedModel)) return []
  return [{ model: savedModel, label: savedModel, efforts }]
}

export const installedAgentsOf = (choice: AgentsChoice | null): readonly AgentName[] =>
  (choice?.installs ?? []).map((install) => install.agent)

export const savedModelOf = (choice: AgentsChoice | null, agent: AgentName): string | null =>
  choice?.installs.find((install) => install.agent === agent)?.model ?? null

export const savedEffortOf = (choice: AgentsChoice | null, agent: AgentName): string | null =>
  choice?.installs.find((install) => install.agent === agent)?.effort ?? null

export const offerModels = (agent: AgentName, agentModels: AgentModels, savedModel: string | null): readonly ModelOffer[] => {
  const listedModels = agentModels[agent] ?? []
  const models = listedModels.length === 0 ? [UNLISTED_MODELS[agent]] : listedModels
  return [...models, ...savedModelsMissingFrom(models, savedModel, UNLISTED_MODELS[agent].efforts)].map(toModelOffer)
}

export const modelLabelOf = (agent: AgentName, agentModels: AgentModels, model: string): string =>
  offerModels(agent, agentModels, model).find((offer) => offer.model === model)?.label ?? model

export const effortLabelOf = (agent: AgentName, agentModels: AgentModels, saved: { readonly model: string, readonly effort: string }): string =>
  offerModels(agent, agentModels, saved.model)
    .find((offer) => offer.model === saved.model)
    ?.efforts.find((offer) => offer.effort === saved.effort)?.label ?? saved.effort

export const offeredEffortOf = (offer: ModelOffer | undefined, preferredEffort: string | null): string =>
  offer?.efforts.find((candidate) => candidate.effort === preferredEffort)?.effort ?? DEFAULT_EFFORT

export interface ModelOption {
  readonly model: string
  readonly label: string
  readonly hasEffortChoice: boolean
  readonly effortOptions: EffortOffer[]
  readonly selectedEffort: string
}

export const toModelOption = (offer: ModelOffer, preferredEffort: string | null): ModelOption => ({
  model: offer.model,
  label: offer.label,
  hasEffortChoice: offer.efforts.length > 1,
  effortOptions: [...offer.efforts],
  selectedEffort: offeredEffortOf(offer, preferredEffort),
})
