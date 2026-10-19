import type { ProcedureContext } from "@/procedures/context"
import { findRepositoryAuthorsProblem } from "@/procedures/get-setup/utils/completion-problem"
import { isSelfAuthorChoiceNeeded } from "@/procedures/get-setup/utils/git-identity"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import {
  findSelectedAuthors,
  withoutIdentityAuthor,
  type AuthorSelection,
  type SelectedAuthorsFinding,
} from "./find-selected-authors"
import type { ListedRepository } from "./plan-repository-addition"

export const resolveRepositoryAuthors = async (
  context: ProcedureContext,
  setup: Setup,
  repository: ListedRepository,
  selection: AuthorSelection,
): Promise<SelectedAuthorsFinding> => {
  const { setupEnvironment } = context
  const [forge, identity] = await Promise.all([
    setupEnvironment.findRepositoryForge(repository.path, setup.forges),
    setupEnvironment.readGitIdentity(repository.path),
  ])
  const source = { repositoryPath: repository.path, forge, forges: setup.forges }
  const isChoiceNeeded = isSelfAuthorChoiceNeeded(forge, identity)
  const finding = await findSelectedAuthors(
    async (authorId) => await setupEnvironment.findAuthor(source, authorId),
    withoutIdentityAuthor(selection, identity),
    isChoiceNeeded,
  )
  if (finding.kind === "rejected") return finding
  const problem = findRepositoryAuthorsProblem({ name: repository.name, ...finding.authors }, isChoiceNeeded)
  return problem === null ? finding : { kind: "rejected", message: problem }
}
