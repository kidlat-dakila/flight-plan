import type { ProcedureContext } from "@/procedures/context"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { DismissNewTargetInput } from "./utils/schemas"

export const dismissNewTarget = async (
  input: DismissNewTargetInput,
  context: ProcedureContext,
): Promise<Repository | null> => await context.repositoryStore.dismissNewTarget(input.repositoryName, input.targetId)
