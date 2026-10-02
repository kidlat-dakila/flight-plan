import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"

const HANDLE_PREFIX_PATTERN = /^@/
const EMAIL_SEPARATOR = "@"

const usernameOf = (detail: string): string => detail.replace(HANDLE_PREFIX_PATTERN, "").split(EMAIL_SEPARATOR)[0] ?? ""

const searchableTextsOf = (user: RepositoryAuthor, query: string): readonly string[] =>
  query.includes(EMAIL_SEPARATOR) ? [user.name, user.detail] : [user.name, usernameOf(user.detail)]

export const matchUsers = (users: readonly RepositoryAuthor[], query: string): readonly RepositoryAuthor[] => {
  const typedText = query.trim().toLowerCase()
  return users.filter((user) =>
    searchableTextsOf(user, typedText).some((text) => text.toLowerCase().includes(typedText)))
}
