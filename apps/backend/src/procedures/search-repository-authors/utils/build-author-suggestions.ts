import { toTrackedAuthor } from "@/procedures/get-setup/utils/build-repositories-step"
import type { RepositoryAuthor, SetupRepository } from "@/procedures/get-setup/utils/setup"
import type { AuthorRole, AuthorSuggestions } from "./schemas"

export interface AuthorSearch {
  readonly role: AuthorRole
  readonly query: string
}

const MAX_SUGGESTIONS = 8
const TRACKED_LABEL = "Tracked"
const SELF_LABEL = "You"
const NO_AUTHORS_MESSAGE = "No authors were found in this repository."

const noMatchMessage = (query: string): string =>
  query.trim() === "" ? NO_AUTHORS_MESSAGE : `No author matches “${query.trim()}”.`

const takenLabelOf = (author: RepositoryAuthor, repository: SetupRepository, role: AuthorRole): string | null => {
  if (repository.selfAuthor?.id === author.id) return SELF_LABEL
  const isTracked = repository.trackedAuthors.some((tracked) => tracked.id === author.id)
  return isTracked && role === "tracked" ? TRACKED_LABEL : null
}

const toOption = (
  author: RepositoryAuthor,
  repository: SetupRepository,
  role: AuthorRole,
): AuthorSuggestions["options"][number] => {
  const stateLabel = takenLabelOf(author, repository, role)
  return { ...toTrackedAuthor(author), isTaken: stateLabel !== null, stateLabel }
}

export const buildAuthorSuggestions = (
  authors: readonly RepositoryAuthor[],
  repository: SetupRepository,
  search: AuthorSearch,
): AuthorSuggestions => ({
  options: authors.slice(0, MAX_SUGGESTIONS).map((author) => toOption(author, repository, search.role)),
  message: authors.length === 0 ? noMatchMessage(search.query) : null,
})
