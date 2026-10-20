import { buildConfigurationStep } from "@/procedures/get-setup/utils/build-configuration-step"
import { PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import type { ConfigurationStep } from "@/procedures/get-setup/utils/schemas"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import { originLabelOf } from "@/procedures/list-configurations/utils/build-configuration-row"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import type { ReviewSection } from "./schemas"

type ConfigurationOption = ConfigurationStep["presets"][number]

const toCustomOption = (configuration: Configuration): ConfigurationOption => ({
  configurationId: configuration.id,
  label: configuration.name,
  bestFor: `${originLabelOf(configuration)}.`,
  description: PRESET_OFFERS[configuration.preset].description,
  note: null,
})

export const buildReviewSection = (setup: Setup, configurations: readonly Configuration[]): ReviewSection => {
  const { presets, selectedConfigurationId, preferences, spotlightGroups } = buildConfigurationStep(setup)
  return {
    section: "review",
    presets: [...presets, ...configurations.filter((configuration) => !configuration.isPreset).map(toCustomOption)],
    selectedConfigurationId,
    preferences,
    spotlightGroups,
  }
}
