import type { ProcedureContext } from "@/procedures/context"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { dismissNewTarget as withTargetDismissed } from "./utils/dismiss-new-target"
import type { DismissNewTargetInput } from "./utils/schemas"

export const dismissNewTarget = async (
  input: DismissNewTargetInput,
  context: ProcedureContext,
): Promise<Repository | null> => {
  const repository = withTargetDismissed(await context.repositoryStore.list(), input.repositoryName, input.targetId)
  if (repository !== null) await context.repositoryStore.replace(repository)
  return repository
}
