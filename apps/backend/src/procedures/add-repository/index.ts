import type { ProcedureContext } from "@/procedures/context"
import { planRepositoryAddition, type RepositoryAddition } from "./utils/plan-repository-addition"
import type { AddRepositoryInput } from "./utils/schemas"

export const addRepository = async (
  input: AddRepositoryInput,
  context: ProcedureContext,
): Promise<RepositoryAddition> => {
  const addition = planRepositoryAddition(await context.repositoryStore.list(), input.path)
  if (addition.kind === "accepted") await context.repositoryStore.add(addition.repository)
  return addition
}
