import type { AuthorSelection } from "@/procedures/add-repository/utils/find-selected-authors"
import { toTrackedAuthor } from "@/procedures/get-setup/utils/build-repositories-step"
import type { RepositoryAuthor, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorSearchResult } from "@/procedures/get-setup/utils/setup-environment"
import { MAX_SUGGESTIONS } from "@/procedures/get-setup/utils/suggestion-limit"
import { FORGE_PROBLEM_MESSAGES } from "@/procedures/list-repositories/utils/forge-problem-messages"
import type { ForgeProblem } from "@/procedures/list-repositories/utils/repository"
import type { AuthorRole, AuthorSuggestions } from "./schemas"

export interface AuthorSearch {
  readonly role: AuthorRole
  readonly forge: SetupForge
  readonly query: string
}

const TRACKED_LABEL = "Tracked"
const SELF_LABEL = "You"
const NO_COMMITS_MESSAGE = "Nobody has committed to this repository yet, so there is no one to pick."
const NO_MEMBERS_MESSAGE = "No one is listed in this repository yet."

const ONLY_YOU_MESSAGE = "You are tracked automatically, and you are the only one here so far."
const ONLY_YOU_MATCHES_MESSAGE = "That is you, and you are tracked automatically."
const PEOPLE_SEARCH_UNSUPPORTED_MESSAGE = "The chosen forge cannot search for people."

const problemMessage = (problem: ForgeProblem): string =>
  problem === "unsupported" ? PEOPLE_SEARCH_UNSUPPORTED_MESSAGE : FORGE_PROBLEM_MESSAGES[problem]

const noUsersMessage = (search: AuthorSearch, hasOnlyTheUser: boolean): string => {
  const typedText = search.query.trim()
  if (hasOnlyTheUser) return typedText === "" ? ONLY_YOU_MESSAGE : ONLY_YOU_MATCHES_MESSAGE
  const isLocalGit = search.forge === "git"
  if (typedText === "") return isLocalGit ? NO_COMMITS_MESSAGE : NO_MEMBERS_MESSAGE
  return isLocalGit
    ? `Nobody matching “${typedText}” has committed here. Try another name or email.`
    : `No one matching “${typedText}” was found. Try another name or username.`
}

const isSelf = (author: RepositoryAuthor, selection: AuthorSelection): boolean =>
  selection.selfAuthorId === author.id

const takenLabelOf = (author: RepositoryAuthor, selection: AuthorSelection, role: AuthorRole): string | null => {
  if (isSelf(author, selection)) return SELF_LABEL
  const isTracked = selection.trackedAuthorIds.includes(author.id)
  return isTracked && role === "tracked" ? TRACKED_LABEL : null
}

const toOption = (
  author: RepositoryAuthor,
  selection: AuthorSelection,
  role: AuthorRole,
): AuthorSuggestions["options"][number] => {
  const stateLabel = takenLabelOf(author, selection, role)
  return { ...toTrackedAuthor(author), isTaken: stateLabel !== null, stateLabel }
}

export const buildAuthorSuggestions = (
  { authors, problem }: AuthorSearchResult,
  selection: AuthorSelection,
  search: AuthorSearch,
): AuthorSuggestions => {
  if (problem !== null) return { options: [], message: problemMessage(problem) }
  const offered = search.role === "tracked" ? authors.filter((author) => !isSelf(author, selection)) : authors
  return {
    options: offered.slice(0, MAX_SUGGESTIONS).map((author) => toOption(author, selection, search.role)),
    message: offered.length === 0 ? noUsersMessage(search, authors.length > 0) : null,
  }
}
