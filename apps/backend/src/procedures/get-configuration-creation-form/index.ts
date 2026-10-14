import { z } from "zod"
import type { ProcedureContext } from "@/procedures/context"
import { defaultConfigurationIdOf } from "@/procedures/get-setup/utils/default-configuration"
import { buildConfigurationRows } from "@/procedures/list-configurations"
import { listConfigurationsOf } from "@/procedures/list-configurations/utils/configuration"
import { configurationRowSchema } from "@/procedures/list-configurations/utils/schemas"

export const configurationCreationFormSchema = z.strictObject({
  sources: z.array(configurationRowSchema),
  selectedSourceId: z.string(),
})

export type ConfigurationCreationForm = z.infer<typeof configurationCreationFormSchema>

export const getConfigurationCreationForm = async (context: ProcedureContext): Promise<ConfigurationCreationForm> => {
  const [saved, setup, texts] = await Promise.all([
    context.configurationStore.read(),
    context.setupStore.read(),
    context.readInstructionTexts(),
  ])
  const defaultId = defaultConfigurationIdOf(setup)
  return { sources: buildConfigurationRows(listConfigurationsOf(saved), texts, defaultId), selectedSourceId: defaultId }
}
