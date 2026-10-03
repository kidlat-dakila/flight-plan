import type { ProcedureContext } from "@/procedures/context"
import { findRepositoryAuthorsProblem } from "@/procedures/get-setup/utils/completion-problem"
import { needsSelfAuthor, type Setup } from "@/procedures/get-setup/utils/setup"
import { findSelectedAuthors, type AuthorSelection, type SelectedAuthorsFinding } from "./find-selected-authors"
import type { ListedRepository } from "./plan-repository-addition"

export const resolveRepositoryAuthors = async (
  context: ProcedureContext,
  setup: Setup,
  repository: ListedRepository,
  selection: AuthorSelection,
): Promise<SelectedAuthorsFinding> => {
  const { setupEnvironment } = context
  const forge = await setupEnvironment.findRepositoryForge(repository.path, setup.forges)
  const source = { repositoryPath: repository.path, forge, forges: setup.forges }
  const finding = await findSelectedAuthors(
    async (authorId) => await setupEnvironment.findAuthor(source, authorId),
    selection,
    needsSelfAuthor(forge),
  )
  if (finding.kind === "rejected") return finding
  const problem = findRepositoryAuthorsProblem({ name: repository.name, ...finding.authors }, needsSelfAuthor(forge))
  return problem === null ? finding : { kind: "rejected", message: problem }
}
