import type { ProcedureContext } from "@/procedures/context"
import { buildSetupPage } from "./utils/build-setup-page"
import { findRepositoryForges } from "./utils/repository-forges"
import type { GetSetupInput, SetupPage } from "./utils/schemas"
import { resolveStep } from "./utils/setup-progress"

export const getSetup = async (input: GetSetupInput, context: ProcedureContext): Promise<SetupPage> => {
  const setup = await context.setupStore.read()
  const step = resolveStep(setup, input.step)
  const [agentDetections, cliProbes, repositoryForges] = await Promise.all([
    step === "agents" ? context.setupEnvironment.detectAgents() : [],
    step === "forges" ? context.setupEnvironment.probeForgeClis() : [],
    step === "repositories" ? findRepositoryForges(setup, context.setupEnvironment) : {},
  ])
  return buildSetupPage({ setup, step, agentDetections, cliProbes, repositoryForges })
}
