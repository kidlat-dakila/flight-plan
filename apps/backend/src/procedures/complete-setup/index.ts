import type { ProcedureContext } from "@/procedures/context"
import { findRepositoryForges } from "@/procedures/get-setup/utils/repository-forges"
import { findRepositoryIdentities } from "@/procedures/get-setup/utils/repository-identities"
import { planSetupCompletion, type RepositoryListing, type SetupCompletion } from "./utils/plan-setup-completion"
import type { CompleteSetupInput } from "./utils/schemas"

const addInOrder = async (additions: readonly RepositoryListing[], context: ProcedureContext): Promise<void> => {
  await additions.reduce(async (earlierAdditions, { repository, authors }) => {
    await earlierAdditions
    await context.repositoryStore.add(repository, authors)
  }, Promise.resolve())
}

export const completeSetup = async (_input: CompleteSetupInput, context: ProcedureContext): Promise<SetupCompletion> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  const [repositoryForges, repositoryIdentities] = await Promise.all([
    findRepositoryForges(setup, context.setupEnvironment),
    findRepositoryIdentities(setup, context.setupEnvironment),
  ])
  const completion = planSetupCompletion(setup, listedRepositories, repositoryForges, repositoryIdentities)
  if (completion.kind === "rejected") return completion
  await addInOrder(completion.additions, context)
  await context.setupStore.write(completion.setup)
  return completion
}
