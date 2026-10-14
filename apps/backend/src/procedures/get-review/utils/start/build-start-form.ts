import type { StartForm } from "@/procedures/get-review/utils/schemas"
import { toModelOption, type AgentModels } from "@/procedures/get-setup/utils/agent-models"
import { defaultConfigurationIdOf } from "@/procedures/get-setup/utils/default-configuration"
import { DEFAULT_PRESET, PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import type { AgentName, Setup } from "@/procedures/get-setup/utils/setup"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import { defaultWriterKeyOf, offerAgents, type AgentOffer } from "./agent-offers"
import { CUSTOM_ORDER, WALKTHROUGH_ORDERS, type WalkthroughOrder } from "./review-request"
import { DEFAULT_ORDER, WALKTHROUGH_ORDER_OFFERS } from "./walkthrough-order-catalog"

const DEFAULT_TAG_LABEL = "Default"

const CUSTOM_PROMPT_FIELD = {
  label: "Your instruction for the order",
  placeholder: "For example: the database migration first, then the code that reads the new column.",
}

type ConfigurationOption = StartForm["configuration"]["options"][number]

const defaultFirst = (configurations: readonly Configuration[], defaultId: string): readonly Configuration[] => [
  ...configurations.filter((configuration) => configuration.id === defaultId),
  ...configurations.filter((configuration) => configuration.id !== defaultId),
]

const offerOf = (configuration: Configuration): Omit<ConfigurationOption, "configurationId" | "tagLabel" | "rewriteNotice"> => {
  const presetOffer = PRESET_OFFERS[configuration.preset]
  return configuration.isPreset
    ? presetOffer
    : { ...presetOffer, label: configuration.name, bestFor: `Your configuration, based on ${presetOffer.label}.` }
}

const toConfigurationOption = (configuration: Configuration, defaultId: string): ConfigurationOption => ({
  configurationId: configuration.id,
  ...offerOf(configuration),
  tagLabel: configuration.id === defaultId ? DEFAULT_TAG_LABEL : null,
  rewriteNotice: null,
})

const selectedIdOf = (configurations: readonly Configuration[], defaultId: string): string =>
  configurations.some((configuration) => configuration.id === defaultId) ? defaultId : DEFAULT_PRESET

const buildConfiguration = (configurations: readonly Configuration[], defaultId: string): StartForm["configuration"] => {
  const selectedId = selectedIdOf(configurations, defaultId)
  return {
    heading: "Configuration",
    hint: "How the agent writes the review: its voice, its wording and the sections it generates.",
    dialogTitle: "Choose a configuration",
    dialogDescription: "The structure of the review stays the same. Only how it is written changes.",
    chooseLabel: "Choose",
    cancelLabel: "Cancel",
    selectedConfigurationId: selectedId,
    options: defaultFirst(configurations, selectedId).map((configuration) => toConfigurationOption(configuration, selectedId)),
  }
}

const toOrderOption = (order: WalkthroughOrder): StartForm["order"]["options"][number] => ({
  order,
  label: WALKTHROUGH_ORDER_OFFERS[order].label,
  tagLabel: order === DEFAULT_ORDER ? DEFAULT_TAG_LABEL : null,
  summary: WALKTHROUGH_ORDER_OFFERS[order].summary,
  description: WALKTHROUGH_ORDER_OFFERS[order].description,
  promptField: order === CUSTOM_ORDER ? CUSTOM_PROMPT_FIELD : null,
})

type AgentOption = StartForm["writer"]["agents"][number]

const toAgentOption = (offer: AgentOffer): AgentOption => ({
  agent: offer.agent,
  label: offer.label,
  description: `Flight Plan starts ${offer.label} in this repository and asks it to write the review.`,
  unavailableReason: offer.unavailableReason,
  modelLegend: `Model for ${offer.label}`,
  effortLegend: `Effort for ${offer.label}`,
  hasModelChoice: offer.models.length > 1,
  modelOptions: offer.models.map((model) => toModelOption(model, offer.preferredEffort)),
  selectedModel: offer.model,
  selectedEffort: offer.effort,
  submitLabel: "Start the review",
})

export const buildStartForm = (
  setup: Setup,
  configurations: readonly Configuration[],
  startableAgents: readonly AgentName[],
  agentModels: AgentModels,
): StartForm => {
  const offers = offerAgents(setup.agents, startableAgents, agentModels)
  return {
    configuration: buildConfiguration(configurations, defaultConfigurationIdOf(setup)),
    order: {
      heading: "Order of the Code Walkthrough",
      hint: "The order the agent puts the changed files in.",
      dialogTitle: "Choose the order of the Code Walkthrough",
      dialogDescription: "Every changed file is covered in each order. Only which file comes first changes.",
      chooseLabel: "Choose",
      cancelLabel: "Cancel",
      selectedOrder: DEFAULT_ORDER,
      customOrder: "",
      options: WALKTHROUGH_ORDERS.map(toOrderOption),
    },
    writer: {
      heading: "Agent",
      hint: "Who writes the review.",
      selectedKey: defaultWriterKeyOf(setup.agents, offers),
      agents: offers.map(toAgentOption),
      manual: {
        label: "I will prompt my agent myself",
        description: "Flight Plan copies the prompt. Paste it into your own agent session.",
        submitLabel: "Copy the prompt",
      },
    },
    pendingLabel: "Starting…",
  }
}
