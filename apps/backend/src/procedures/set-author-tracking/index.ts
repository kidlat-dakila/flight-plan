import type { ProcedureContext } from "@/procedures/context"
import { authorForgeOf, type Setup } from "@/procedures/get-setup/utils/setup"
import { withoutTrackedAuthor, withTrackedAuthor } from "./utils/author-tracking"
import type { SetAuthorTrackingInput } from "./utils/schemas"

export const setAuthorTracking = async (
  input: SetAuthorTrackingInput,
  context: ProcedureContext,
): Promise<Setup | null> => {
  const setup = await context.setupStore.read()
  const repository = setup.repositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return null
  if (!input.isTracked) {
    const changedSetup = withoutTrackedAuthor(setup, repository.name, input.authorId)
    await context.setupStore.write(changedSetup)
    return changedSetup
  }
  const author = await context.setupEnvironment.findAuthor(
    { repositoryPath: repository.path, forge: authorForgeOf(setup) },
    input.authorId,
  )
  if (author === null) return null
  const changedSetup = withTrackedAuthor(setup, repository.name, author)
  await context.setupStore.write(changedSetup)
  return changedSetup
}
