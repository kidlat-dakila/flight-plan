import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { findCompletionProblem } from "./completion-problem"
import { FORGE_OFFERS } from "./forge-catalog"
import type { RepositoriesStep, TrackedAuthor } from "./schemas"
import { authorForgeOf, type RepositoryAuthor, type Setup, type SetupForge, type SetupRepository } from "./setup"

type RepositoryEntry = RepositoriesStep["repositories"][number]

const COMMIT_SEARCH_HINT = "Searches the authors of the last 1,000 commits."
const MISSING_AUTHOR_MESSAGE = "Track at least one author to follow this repository."
const SELF_AUTHOR_HINT
  = "Local git cannot tell which author is you. Pick yourself from the authors of the last 1,000 commits."
const SELF_CHOSEN_LABEL = "You"
const SELF_MISSING_LABEL = "Not chosen"

const authorSearchHint = (forge: SetupForge): string =>
  forge === "git" ? COMMIT_SEARCH_HINT : `Searches the members of this repository through ${FORGE_OFFERS[forge].label}.`

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
  selfAuthor: forge === "git" ? toSelfAuthor(repository) : null,
  trackedAuthors: repository.trackedAuthors.map(toTrackedAuthor),
  missingAuthorMessage: forge !== "git" && repository.trackedAuthors.length === 0 ? MISSING_AUTHOR_MESSAGE : null,
})

export const buildRepositoriesStep = (setup: Setup): RepositoriesStep => {
  const finishHint = findCompletionProblem(setup)
  return {
    step: "repositories",
    repositories: setup.repositories.map((repository, position) =>
      toRepositoryEntry(repository, position, authorForgeOf(setup)),
    ),
    isReadyToFinish: finishHint === null,
    finishHint,
  }
}
