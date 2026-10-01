import type { Repository, ReviewTarget } from "@/repository/repository"
import { monogramOf } from "./monogram"
import type { AuthorFilter } from "./schemas"

const NO_AUTHOR_KEY = ""
const NO_AUTHOR_LABEL = "No author"

interface KnownAuthor {
  readonly key: string
  readonly avatarUrl: string | null
}

export const authorKeyOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? target.author : NO_AUTHOR_KEY

const toKnownAuthor = (target: ReviewTarget): KnownAuthor => ({
  key: authorKeyOf(target),
  avatarUrl: target.kind === "pull-request" ? target.authorAvatarUrl : null,
})

const byNameWithNoAuthorLast = (first: KnownAuthor, second: KnownAuthor): number => {
  if (first.key === NO_AUTHOR_KEY) return 1
  if (second.key === NO_AUTHOR_KEY) return -1
  return first.key.localeCompare(second.key)
}

const allTargets = (repositories: readonly Repository[]): ReviewTarget[] =>
  repositories.flatMap((repository) => repository.targets)

const knownAuthors = (repositories: readonly Repository[]): KnownAuthor[] =>
  [...new Map(allTargets(repositories).map((target) => [authorKeyOf(target), toKnownAuthor(target)])).values()]
    .sort(byNameWithNoAuthorLast)

export const selectAuthorKeys = (
  repositories: readonly Repository[],
  requestedAuthors: readonly string[] | null,
): string[] =>
  knownAuthors(repositories)
    .map((author) => author.key)
    .filter((key) => requestedAuthors === null || requestedAuthors.includes(key))

const toggledKeys = (selectedKeys: readonly string[], toggled: string): string[] =>
  selectedKeys.includes(toggled) ? selectedKeys.filter((key) => key !== toggled) : [...selectedKeys, toggled]

const toggledAuthors = (
  authors: readonly KnownAuthor[],
  selectedKeys: readonly string[],
  toggled: string,
): string[] | null => {
  const nextKeys = toggledKeys(selectedKeys, toggled)
  return authors.every((author) => nextKeys.includes(author.key)) ? null : nextKeys
}

const targetCount = (repositories: readonly Repository[], key: string): number =>
  allTargets(repositories).filter((target) => authorKeyOf(target) === key).length

const buttonLabel = (authorCount: number, selectedCount: number): string =>
  selectedCount === authorCount ? "Author: all" : `Author: ${String(selectedCount)} of ${String(authorCount)}`

export const buildAuthorFilter = (repositories: readonly Repository[], selectedKeys: readonly string[]): AuthorFilter => {
  const authors = knownAuthors(repositories)
  return {
    buttonLabel: buttonLabel(authors.length, selectedKeys.length),
    isDefault: selectedKeys.length === authors.length,
    options: authors.map((author) => ({
      key: author.key,
      label: author.key === NO_AUTHOR_KEY ? NO_AUTHOR_LABEL : author.key,
      person: author.key === NO_AUTHOR_KEY ? null : { avatarUrl: author.avatarUrl, monogram: monogramOf(author.key) },
      countLabel: String(targetCount(repositories, author.key)),
      isSelected: selectedKeys.includes(author.key),
      toggledAuthors: toggledAuthors(authors, selectedKeys, author.key),
    })),
  }
}
