import type { ProcedureContext } from "@/procedures/context"
import { EARLIER_STEPS_MESSAGE, isStepReachable } from "@/procedures/get-setup/utils/setup-progress"
import { planSetupRepository, withRepository, type SetupRepositoryPlan } from "./utils/plan-setup-repository"
import type { AddSetupRepositoryInput } from "./utils/schemas"

const notRepositoryMessage = (path: string): string => `${path} is not a git repository.`

export const addSetupRepository = async (
  input: AddSetupRepositoryInput,
  context: ProcedureContext,
): Promise<SetupRepositoryPlan> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.list()])
  if (!isStepReachable(setup, "repositories")) return { kind: "rejected", message: EARLIER_STEPS_MESSAGE }
  const plan = planSetupRepository(setup, listedRepositories, input.path)
  if (plan.kind === "rejected") return plan
  if (!(await context.setupEnvironment.isRepositoryFolder(plan.repository.path))) {
    return { kind: "rejected", message: notRepositoryMessage(plan.repository.path) }
  }
  await context.setupStore.write(withRepository(setup, plan.repository))
  return plan
}
