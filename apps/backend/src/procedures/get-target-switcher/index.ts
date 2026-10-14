import type { ProcedureContext } from "@/procedures/context"
import { addReviewedBranches } from "@/procedures/list-repositories"
import { buildTargetSwitcher } from "./utils/build-target-switcher"
import type { GetTargetSwitcherInput, TargetSwitcher } from "./utils/schemas"

export const getTargetSwitcher = async (
  input: GetTargetSwitcherInput,
  context: ProcedureContext,
): Promise<TargetSwitcher | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const switchable = await addReviewedBranches(repository, context)
  return buildTargetSwitcher({ repository: switchable, currentTargetId: input.targetId, query: input.query }, context.now())
}
