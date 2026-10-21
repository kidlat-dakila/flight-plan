import { PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import type { ConfigurationStep } from "@/procedures/get-setup/utils/schemas"
import { originLabelOf } from "./build-configuration-row"
import type { Configuration } from "./configuration"

export type ConfigurationOption = ConfigurationStep["presets"][number]

const presetOptionOf = (configuration: Configuration): ConfigurationOption => ({
  ...PRESET_OFFERS[configuration.preset],
  configurationId: configuration.id,
  label: configuration.name,
})

const customOptionOf = (configuration: Configuration): ConfigurationOption => ({
  configurationId: configuration.id,
  label: configuration.name,
  bestFor: `${originLabelOf(configuration)}.`,
  description: PRESET_OFFERS[configuration.preset].description,
  note: null,
})

export const configurationOptionOf = (configuration: Configuration): ConfigurationOption =>
  configuration.isPreset ? presetOptionOf(configuration) : customOptionOf(configuration)
