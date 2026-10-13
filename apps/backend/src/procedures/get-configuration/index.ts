import type { ProcedureContext } from "@/procedures/context"
import { findConfiguration } from "@/procedures/list-configurations/utils/configuration"
import { buildConfigurationPage } from "./utils/build-configuration-page"
import type { ConfigurationPage, GetConfigurationInput } from "./utils/schemas"

export const MISSING_CONFIGURATION_MESSAGE = "Flight Plan has no configuration at this address. It may have been deleted."

export const getConfiguration = async (input: GetConfigurationInput, context: ProcedureContext): Promise<ConfigurationPage> => {
  const [saved, texts] = await Promise.all([context.configurationStore.read(), context.readInstructionTexts()])
  const configuration = findConfiguration(saved, input.id)
  return configuration === null
    ? { kind: "missing", message: MISSING_CONFIGURATION_MESSAGE }
    : buildConfigurationPage(configuration, texts, input.field)
}
