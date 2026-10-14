import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { findCompletionProblem } from "./completion-problem"
import type { RepositoriesStep, TrackedAuthor } from "./schemas"
import {
  repositoryForgeOf,
  type RepositoryAuthor,
  type RepositoryForges,
  type Setup,
  type SetupForge,
  type SetupRepository,
} from "./setup"

type RepositoryEntry = RepositoriesStep["repositories"][number]

const COMMIT_SEARCH_PLACEHOLDER = "Type a name or email"
const FORGE_SEARCH_PLACEHOLDER = "Type a name or username"
export const SELF_AUTHOR_HINT
  = "Git cannot tell who you are here. Search for the name or email you commit with, then pick yourself."
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

const toSelfAuthor = (repository: SetupRepository): NonNullable<RepositoryEntry["selfAuthor"]> => ({
  hint: SELF_AUTHOR_HINT,
  author: repository.selfAuthor === null ? null : toTrackedAuthor(repository.selfAuthor),
  stateLabel: repository.selfAuthor === null ? SELF_MISSING_LABEL : SELF_CHOSEN_LABEL,
})

const toRepositoryEntry = (repository: SetupRepository, position: number, forge: SetupForge): RepositoryEntry => ({
  name: repository.name,
  path: repository.path,
  lineColor: lineColorAt(position),
  lineLabel: repository.name.charAt(0).toUpperCase(),
  authorSearchHint: authorSearchHint(forge),
  authorSearchPlaceholder: authorSearchPlaceholder(forge),
  selfAuthor: forge === "git" ? toSelfAuthor(repository) : null,
  trackedAuthors: repository.trackedAuthors.map(toTrackedAuthor),
})

export const buildRepositoriesStep = (setup: Setup, repositoryForges: RepositoryForges): RepositoriesStep => {
  const finishHint = findCompletionProblem(setup, repositoryForges)
  return {
    step: "repositories",
    repositories: setup.repositories.map((repository, position) =>
      toRepositoryEntry(repository, position, repositoryForgeOf(setup, repositoryForges, repository.path)),
    ),
    isReadyToFinish: finishHint === null,
    finishHint,
  }
}
