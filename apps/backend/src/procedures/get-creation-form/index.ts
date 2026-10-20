import type { ProcedureContext } from "@/procedures/context"
import { buildCreationForm } from "./utils/build-creation-form"
import type { CreationForm, GetCreationFormInput } from "./utils/schemas"

export const getCreationForm = async (
  input: GetCreationFormInput,
  context: ProcedureContext,
): Promise<CreationForm | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  return repository === undefined ? null : buildCreationForm(repository.name)
}
