import type { ProcedureContext } from "@/procedures/context"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import {
  findSelectedAuthors,
  withoutIdentityAuthor,
  type SelectedAuthorsFinding,
  type TrackedSelection,
} from "./find-selected-authors"
import type { ListedRepository } from "./plan-repository-addition"

export const resolveRepositoryAuthors = async (
  context: ProcedureContext,
  setup: Setup,
  repository: ListedRepository,
  selection: TrackedSelection,
): Promise<SelectedAuthorsFinding> => {
  const { setupEnvironment } = context
  const [forge, identity] = await Promise.all([
    setupEnvironment.findRepositoryForge(repository.path, setup.forges),
    setupEnvironment.readGitIdentity(repository.path),
  ])
  const source = { repositoryPath: repository.path, forge, forges: setup.forges }
  return await findSelectedAuthors(
    async (authorId) => await setupEnvironment.findAuthor(source, authorId),
    withoutIdentityAuthor(selection, identity),
  )
}
