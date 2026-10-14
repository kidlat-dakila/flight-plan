import { DEFAULT_PRESET, PRESET_OFFERS } from "./preset-catalog"
import { PRESET_NAMES, type PresetName, type Setup } from "./setup"

export const isPresetName = (id: string): id is PresetName => PRESET_NAMES.some((preset) => preset === id)

export const defaultConfigurationIdOf = (setup: Setup): string => setup.defaultConfiguration ?? DEFAULT_PRESET

export const presetLabelOf = (id: string): string => (isPresetName(id) ? PRESET_OFFERS[id].label : id)
