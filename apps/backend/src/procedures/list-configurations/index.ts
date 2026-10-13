import type { ProcedureContext } from "@/procedures/context"
import type { InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { DEFAULT_PRESET } from "@/procedures/get-setup/utils/preset-catalog"
import { buildConfigurationRow } from "./utils/build-configuration-row"
import { listConfigurationsOf, type Configuration } from "./utils/configuration"
import type { ConfigurationList, ConfigurationRow } from "./utils/schemas"

const PRESETS_TITLE = "Presets"
const OWN_TITLE = "Your configurations"
const DEFAULT_LABEL = "Default"
const NO_OWN_MESSAGE = "You have no configuration of your own yet. Duplicate a preset to start one."

export const buildConfigurationRows = (
  configurations: readonly Configuration[],
  texts: InstructionTexts,
  defaultId: string,
): ConfigurationRow[] =>
  configurations.map((configuration) =>
    buildConfigurationRow(configuration, texts, configuration.id === defaultId ? DEFAULT_LABEL : null),
  )

export const listConfigurations = async (context: ProcedureContext): Promise<ConfigurationList> => {
  const [saved, setup, texts] = await Promise.all([
    context.configurationStore.read(),
    context.setupStore.read(),
    context.readInstructionTexts(),
  ])
  const configurations = listConfigurationsOf(saved)
  const defaultId = setup.preset ?? DEFAULT_PRESET
  const ownRows = buildConfigurationRows(configurations.filter((configuration) => !configuration.isPreset), texts, defaultId)
  return {
    groups: [
      {
        title: PRESETS_TITLE,
        rows: buildConfigurationRows(configurations.filter((configuration) => configuration.isPreset), texts, defaultId),
        emptyMessage: null,
      },
      { title: OWN_TITLE, rows: ownRows, emptyMessage: ownRows.length === 0 ? NO_OWN_MESSAGE : null },
    ],
  }
}
