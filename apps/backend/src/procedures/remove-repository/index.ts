import type { ProcedureContext } from "@/procedures/context"
import type { RemoveRepositoryInput } from "./utils/schemas"

export const removeRepository = async (
  input: RemoveRepositoryInput,
  context: ProcedureContext,
): Promise<{ readonly name: string } | null> =>
  (await context.repositoryStore.remove(input.name)) ? { name: input.name } : null
