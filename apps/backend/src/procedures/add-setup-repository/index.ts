import { notRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import { resolveRepositoryAuthors } from "@/procedures/add-repository/utils/resolve-repository-authors"
import type { ProcedureContext } from "@/procedures/context"
import { EARLIER_STEPS_MESSAGE, isStepReachable } from "@/procedures/get-setup/utils/setup-progress"
import { planSetupRepository, withRepository, type SetupRepositoryPlan } from "./utils/plan-setup-repository"
import type { AddSetupRepositoryInput } from "./utils/schemas"

export const addSetupRepository = async (
  input: AddSetupRepositoryInput,
  context: ProcedureContext,
): Promise<SetupRepositoryPlan> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  if (!isStepReachable(setup, "repositories")) return { kind: "rejected", message: EARLIER_STEPS_MESSAGE }
  const plan = planSetupRepository(setup, listedRepositories, input.path)
  if (plan.kind === "rejected") return plan
  if (!(await context.setupEnvironment.isRepositoryFolder(plan.repository.path))) {
    return { kind: "rejected", message: notRepositoryMessage(plan.repository.path) }
  }
  const finding = await resolveRepositoryAuthors(context, setup, plan.repository, input)
  if (finding.kind === "rejected") return finding
  const repository = { ...plan.repository, ...finding.authors }
  await context.setupStore.write(withRepository(setup, repository))
  return { kind: "accepted", repository }
}
