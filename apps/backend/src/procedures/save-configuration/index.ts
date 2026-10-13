import type { ProcedureContext } from "@/procedures/context"
import { MISSING_CONFIGURATION_MESSAGE } from "@/procedures/get-configuration"
import { listConfigurationsOf, withSaved } from "@/procedures/list-configurations/utils/configuration"
import { planChange } from "./utils/plan-change"
import type { ConfigurationSaving, SaveConfigurationInput } from "./utils/schemas"

export const saveConfiguration = async (
  input: SaveConfigurationInput,
  context: ProcedureContext,
): Promise<ConfigurationSaving> => {
  const [saved, texts] = await Promise.all([context.configurationStore.read(), context.readInstructionTexts()])
  const plan = planChange(listConfigurationsOf(saved), input, texts, MISSING_CONFIGURATION_MESSAGE)
  if (plan.kind === "rejected") return plan
  await context.configurationStore.write(withSaved(saved, plan.configuration))
  return { kind: "saved", message: plan.message }
}
