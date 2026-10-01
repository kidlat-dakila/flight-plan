import type { ProcedureContext } from "@/procedures/context"
import { authorForgeOf } from "@/procedures/get-setup/utils/setup"
import { buildAuthorSuggestions } from "./utils/build-author-suggestions"
import type { AuthorSuggestions, SearchRepositoryAuthorsInput } from "./utils/schemas"

export const searchRepositoryAuthors = async (
  input: SearchRepositoryAuthorsInput,
  context: ProcedureContext,
): Promise<AuthorSuggestions | null> => {
  const setup = await context.setupStore.read()
  const repository = setup.repositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return null
  const authors = await context.setupEnvironment.searchAuthors(
    { repositoryPath: repository.path, forge: authorForgeOf(setup) },
    input.query,
  )
  return buildAuthorSuggestions(authors, repository, { role: input.role, query: input.query })
}
