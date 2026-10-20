import { buildReviewPreferencesPage } from "@/procedures/get-review-preferences/utils/build-review-preferences-page"
import { DEFAULT_PRESET, PRESET_OFFERS } from "./preset-catalog"
import type { ConfigurationStep } from "./schemas"
import { PRESET_NAMES, type Setup } from "./setup"

export const buildConfigurationStep = (setup: Setup): ConfigurationStep => {
  const { preferences, spotlightGroups } = buildReviewPreferencesPage(setup)
  return {
    step: "configuration",
    presets: PRESET_NAMES.map((name) => ({ configurationId: name, ...PRESET_OFFERS[name] })),
    selectedConfigurationId: setup.defaultConfiguration ?? DEFAULT_PRESET,
    preferences,
    spotlightGroups,
  }
}
