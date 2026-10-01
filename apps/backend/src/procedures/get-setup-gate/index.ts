import type { ProcedureContext } from "@/procedures/context"
import { planSetupGate } from "./utils/plan-setup-gate"
import type { GetSetupGateInput, SetupGate } from "./utils/schemas"

export const getSetupGate = async (input: GetSetupGateInput, context: ProcedureContext): Promise<SetupGate> => {
  const setup = await context.setupStore.read()
  return planSetupGate(setup.isComplete, input.path)
}
