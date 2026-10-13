import type { ProcedureContext } from "@/procedures/context"
import { listConfigurationsOf, withSaved } from "@/procedures/list-configurations/utils/configuration"
import { planCreation } from "./utils/plan-creation"
import type { ConfigurationCreation, CreateConfigurationInput } from "./utils/schemas"

export const createConfiguration = async (
  input: CreateConfigurationInput,
  context: ProcedureContext,
): Promise<ConfigurationCreation> => {
  const saved = await context.configurationStore.read()
  const plan = planCreation(listConfigurationsOf(saved), input.sourceId, input.name)
  if (plan.kind === "rejected") return plan
  await context.configurationStore.write(withSaved(saved, plan.configuration))
  return { kind: "created", id: plan.configuration.id }
}
