import type { ProcedureContext } from "@/procedures/context"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { planSetupCompletion, type SetupCompletion } from "./utils/plan-setup-completion"
import type { CompleteSetupInput } from "./utils/schemas"

const addInOrder = async (repositories: readonly Repository[], context: ProcedureContext): Promise<void> => {
  await repositories.reduce(async (earlierAdditions, repository) => {
    await earlierAdditions
    await context.repositoryStore.add(repository)
  }, Promise.resolve())
}

export const completeSetup = async (_input: CompleteSetupInput, context: ProcedureContext): Promise<SetupCompletion> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.list()])
  const completion = planSetupCompletion(setup, listedRepositories)
  if (completion.kind === "rejected") return completion
  await addInOrder(completion.repositories, context)
  await context.setupStore.write(completion.setup)
  return completion
}
