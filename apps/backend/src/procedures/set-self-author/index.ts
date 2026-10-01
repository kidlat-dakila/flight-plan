import type { ProcedureContext } from "@/procedures/context"
import { authorForgeOf, type Setup } from "@/procedures/get-setup/utils/setup"
import { withSelfAuthor } from "@/procedures/set-author-tracking/utils/author-tracking"
import type { SetSelfAuthorInput } from "./utils/schemas"

export const setSelfAuthor = async (input: SetSelfAuthorInput, context: ProcedureContext): Promise<Setup | null> => {
  const setup = await context.setupStore.read()
  const repository = setup.repositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return null
  const author = input.authorId === null
    ? null
    : await context.setupEnvironment.findAuthor(
        { repositoryPath: repository.path, forge: authorForgeOf(setup) },
        input.authorId,
      )
  if (input.authorId !== null && author === null) return null
  const changedSetup = withSelfAuthor(setup, repository.name, author)
  await context.setupStore.write(changedSetup)
  return changedSetup
}
