import { buildConfigurationStep } from "@/procedures/get-setup/utils/build-configuration-step"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import { configurationOptionOf } from "@/procedures/list-configurations/utils/configuration-option"
import type { ReviewSection } from "./schemas"

export const buildReviewSection = (setup: Setup, configurations: readonly Configuration[]): ReviewSection => {
  const { presets, selectedConfigurationId, preferences, spotlightGroups } = buildConfigurationStep(setup)
  return {
    section: "review",
    presets: [...presets, ...configurations.filter((configuration) => !configuration.isPreset).map(configurationOptionOf)],
    selectedConfigurationId,
    preferences,
    spotlightGroups,
  }
}
