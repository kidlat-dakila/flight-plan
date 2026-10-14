import { DEFAULT_PRESET, PRESET_OFFERS } from "./preset-catalog"
import type { ConfigurationStep } from "./schemas"
import { PRESET_NAMES } from "./setup"

export const buildConfigurationStep = (defaultConfiguration: string | null): ConfigurationStep => ({
  step: "configuration",
  presets: PRESET_NAMES.map((name) => ({ configurationId: name, ...PRESET_OFFERS[name] })),
  selectedConfigurationId: defaultConfiguration ?? DEFAULT_PRESET,
})
