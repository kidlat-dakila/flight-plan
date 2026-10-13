import { z } from "zod"
import type { ProcedureContext } from "@/procedures/context"
import { MISSING_CONFIGURATION_MESSAGE } from "@/procedures/get-configuration"
import { findConfiguration } from "@/procedures/list-configurations/utils/configuration"

export const deleteConfigurationInputSchema = z.strictObject({ id: z.string() })

export const configurationDeletionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("deleted") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type DeleteConfigurationInput = z.infer<typeof deleteConfigurationInputSchema>
export type ConfigurationDeletion = z.infer<typeof configurationDeletionSchema>

const PRESET_MESSAGE = "A preset cannot be deleted. Reset the fields you changed instead."

export const deleteConfiguration = async (
  input: DeleteConfigurationInput,
  context: ProcedureContext,
): Promise<ConfigurationDeletion> => {
  const saved = await context.configurationStore.read()
  const configuration = findConfiguration(saved, input.id)
  if (configuration === null) return { kind: "rejected", message: MISSING_CONFIGURATION_MESSAGE }
  if (configuration.isPreset) return { kind: "rejected", message: PRESET_MESSAGE }
  await context.configurationStore.write(saved.filter((listed) => listed.id !== input.id))
  return { kind: "deleted" }
}
