import { DEFAULT_PRESET, PRESET_OFFERS } from "./preset-catalog"
import type { ConfigurationStep } from "./schemas"
import { PRESET_NAMES, type PresetName } from "./setup"

export const buildConfigurationStep = (preset: PresetName | null): ConfigurationStep => ({
  step: "configuration",
  presets: PRESET_NAMES.map((name) => ({ preset: name, ...PRESET_OFFERS[name] })),
  selectedPreset: preset ?? DEFAULT_PRESET,
})
