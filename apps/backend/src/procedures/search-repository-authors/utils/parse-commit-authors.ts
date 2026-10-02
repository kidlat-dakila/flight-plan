import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"

export const COMMIT_AUTHOR_SEPARATOR = "\u001F"

const LINE_BREAK_PATTERN = /\r?\n/

const toCommitAuthor = (line: string): RepositoryAuthor | null => {
  const [name = "", email = ""] = line.split(COMMIT_AUTHOR_SEPARATOR)
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail === ""
    ? null
    : { id: normalizedEmail, name: name.trim(), detail: normalizedEmail, avatarUrl: null }
}

const isFirstWithId = (author: RepositoryAuthor, position: number, authors: readonly RepositoryAuthor[]): boolean =>
  authors.findIndex((listed) => listed.id === author.id) === position

export const parseCommitAuthors = (logOutput: string): readonly RepositoryAuthor[] =>
  logOutput
    .split(LINE_BREAK_PATTERN)
    .map(toCommitAuthor)
    .filter((author): author is RepositoryAuthor => author !== null)
    .filter(isFirstWithId)
