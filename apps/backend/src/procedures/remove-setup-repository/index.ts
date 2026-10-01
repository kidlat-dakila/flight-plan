import type { ProcedureContext } from "@/procedures/context"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import type { RemoveSetupRepositoryInput } from "./utils/schemas"
import { withoutRepository } from "./utils/without-repository"

export const removeSetupRepository = async (
  input: RemoveSetupRepositoryInput,
  context: ProcedureContext,
): Promise<Setup | null> => {
  const setup = withoutRepository(await context.setupStore.read(), input.name)
  if (setup !== null) await context.setupStore.write(setup)
  return setup
}
