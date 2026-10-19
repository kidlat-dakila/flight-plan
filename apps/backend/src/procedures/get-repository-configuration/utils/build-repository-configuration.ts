import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { buildAuthorForm } from "@/procedures/get-author-form/utils/build-author-form"
import { toTrackedAuthor } from "@/procedures/get-setup/utils/build-repositories-step"
import type { GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import type { RepositoryConfiguration } from "./schemas"

export const buildRepositoryConfiguration = (
  repository: ListedRepository,
  authors: SelectedAuthors,
  forge: SetupForge,
  identity: GitIdentity | null,
): RepositoryConfiguration => ({
  name: repository.name,
  path: repository.path,
  form: buildAuthorForm(forge, identity),
  selfAuthor: authors.selfAuthor === null ? null : toTrackedAuthor(authors.selfAuthor),
  trackedAuthors: authors.trackedAuthors.map(toTrackedAuthor),
})
