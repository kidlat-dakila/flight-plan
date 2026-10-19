import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { findRepositoriesProblem } from "./completion-problem"
import { repositoryIdentityOf, toIdentityAuthor, type GitIdentity, type RepositoryIdentities } from "./git-identity"
import type { RepositoriesStep, TrackedAuthor } from "./schemas"
import {
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
export const SELF_AUTHOR_HINT
  = "Git has no email set for you in this repository, so Flight Plan can't tell which commits are yours. Search for the name or email you commit with and pick yourself."
export const SELF_FROM_GIT_CONFIG_LABEL = "You, from git config"
const SELF_CHOSEN_LABEL = "You"
const SELF_MISSING_LABEL = "Not chosen"

export const authorSearchHint = (forge: SetupForge): string =>
  `Ask Flight Plan to look for ${forge === "git" ? "branches" : "pull requests"} made by your team members.`

export const authorSearchPlaceholder = (forge: SetupForge): string =>
  forge === "git" ? COMMIT_SEARCH_PLACEHOLDER : FORGE_SEARCH_PLACEHOLDER

export const toTrackedAuthor = (author: RepositoryAuthor): TrackedAuthor => ({
  id: author.id,
  name: author.name,
  detail: author.detail,
  avatarUrl: author.avatarUrl,
  monogram: monogramOf(author.name),
})

const toChosenSelfAuthor = (repository: SetupRepository): NonNullable<RepositoryEntry["selfAuthor"]> => ({
  hint: SELF_AUTHOR_HINT,
  author: repository.selfAuthor === null ? null : toTrackedAuthor(repository.selfAuthor),
  stateLabel: repository.selfAuthor === null ? SELF_MISSING_LABEL : SELF_CHOSEN_LABEL,
  isChangeable: true,
})

const toIdentitySelfAuthor = (identity: GitIdentity): NonNullable<RepositoryEntry["selfAuthor"]> => ({
  hint: SELF_AUTHOR_HINT,
  author: toTrackedAuthor(toIdentityAuthor(identity)),
  stateLabel: SELF_FROM_GIT_CONFIG_LABEL,
  isChangeable: false,
})

const toSelfAuthor = (repository: SetupRepository, identity: GitIdentity | null): NonNullable<RepositoryEntry["selfAuthor"]> =>
  identity === null ? toChosenSelfAuthor(repository) : toIdentitySelfAuthor(identity)

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
  authorSearchHint: authorSearchHint(forge),
  authorSearchPlaceholder: authorSearchPlaceholder(forge),
  selfAuthor: forge === "git" ? toSelfAuthor(repository, identity) : null,
  trackedAuthors: repository.trackedAuthors.map(toTrackedAuthor),
})

export const buildRepositoriesStep = (
  setup: Setup,
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): RepositoriesStep => {
  const continueHint = findRepositoriesProblem(setup, repositoryForges, repositoryIdentities)
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
