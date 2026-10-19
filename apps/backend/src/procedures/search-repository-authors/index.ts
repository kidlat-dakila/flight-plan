import { authorSelectionOf, withIdentityAsSelf } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ProcedureContext } from "@/procedures/context"
import { buildAuthorSuggestions } from "./utils/build-author-suggestions"
import type { AuthorSuggestions, SearchRepositoryAuthorsInput } from "./utils/schemas"

export const searchRepositoryAuthors = async (
  input: SearchRepositoryAuthorsInput,
  context: ProcedureContext,
): Promise<AuthorSuggestions | null> => {
  const setup = await context.setupStore.read()
  const repository = setup.repositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return null
  const [forge, identity] = await Promise.all([
    context.setupEnvironment.findRepositoryForge(repository.path, setup.forges),
    context.setupEnvironment.readGitIdentity(repository.path),
  ])
  const found = await context.setupEnvironment.searchAuthors(
    { repositoryPath: repository.path, forge, forges: setup.forges },
    input.query,
  )
  return buildAuthorSuggestions(found, withIdentityAsSelf(authorSelectionOf(repository), identity), {
    role: input.role,
    forge,
    query: input.query,
  })
}
