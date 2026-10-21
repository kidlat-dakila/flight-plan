import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { findRepositoriesProblem } from "./completion-problem"
import { repositoryIdentityOf, toIdentityAuthor, type GitIdentity, type RepositoryIdentities } from "./git-identity"
import type { RepositoriesStep, TrackedAuthor } from "./schemas"
import {
  LOCAL_GIT_FORGE,
  repositoryForgeOf,
  type RepositoryAuthor,
  type RepositoryForges,
  type Setup,
  type SetupForge,
  type SetupRepository,
} from "./setup"

export type RepositoryEntry = RepositoriesStep["repositories"][number]

const COMMIT_SEARCH_PLACEHOLDER = "Type a name or email"
const FORGE_SEARCH_PLACEHOLDER = "Type a name or username"

const LOCAL_GIT_AUTHOR_SEARCH_HINT = "By default, Flight Plan lists only the branches you add. Add your teammates here to see their branches and yours too."
const forgeAuthorSearchHint = (repositoryName: string): string =>
  `By default, Flight Plan shows everyone's pull requests in ${repositoryName}. To see only your teammates' pull requests and yours, add them here.`

export const authorSearchHint = (forge: SetupForge, repositoryName: string): string =>
  forge === "git" ? LOCAL_GIT_AUTHOR_SEARCH_HINT : forgeAuthorSearchHint(repositoryName)

export const authorSearchPlaceholder = (forge: SetupForge): string =>
  forge === "git" ? COMMIT_SEARCH_PLACEHOLDER : FORGE_SEARCH_PLACEHOLDER

export const toTrackedAuthor = (author: RepositoryAuthor): TrackedAuthor => ({
  id: author.id,
  name: author.name,
  detail: author.detail,
  avatarUrl: author.avatarUrl,
  monogram: monogramOf(author.name),
})

const selfAuthorOf = (forge: SetupForge, identity: GitIdentity | null): TrackedAuthor | null =>
  forge === LOCAL_GIT_FORGE && identity !== null ? toTrackedAuthor(toIdentityAuthor(identity)) : null

export const toRepositoryEntry = (
  repository: SetupRepository,
  position: number,
  forge: SetupForge,
  identity: GitIdentity | null,
): RepositoryEntry => ({
  name: repository.name,
  path: repository.path,
  lineColor: lineColorAt(position),
  lineLabel: repository.name.charAt(0).toUpperCase(),
  authorSearchHint: authorSearchHint(forge, repository.name),
  authorSearchPlaceholder: authorSearchPlaceholder(forge),
  selfAuthor: selfAuthorOf(forge, identity),
  trackedAuthors: repository.trackedAuthors.map(toTrackedAuthor),
})

export const buildRepositoriesStep = (
  setup: Setup,
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): RepositoriesStep => {
  const continueHint = findRepositoriesProblem(setup)
  return {
    step: "repositories",
    repositories: setup.repositories.map((repository, position) =>
      toRepositoryEntry(
        repository,
        position,
        repositoryForgeOf(repositoryForges, repository.path),
        repositoryIdentityOf(repositoryIdentities, repository.path),
      ),
    ),
    isReadyToContinue: continueHint === null,
    continueHint,
  }
}
