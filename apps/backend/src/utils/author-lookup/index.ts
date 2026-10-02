import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { matchUsers } from "@/procedures/search-repository-authors/utils/match-users"
import type { CommitAuthorReader } from "@/utils/commit-author-reader"

const LOCAL_GIT = "git"

export interface AuthorLookupOptions {
  readonly readCommitAuthors: CommitAuthorReader
  readonly forgeLookup: Pick<SetupEnvironment, "searchAuthors" | "findAuthor">
}

export const createAuthorLookup = (
  options: AuthorLookupOptions,
): Pick<SetupEnvironment, "searchAuthors" | "findAuthor"> => ({
  searchAuthors: async (source, query) =>
    source.forge === LOCAL_GIT
      ? matchUsers(await options.readCommitAuthors(source.repositoryPath), query)
      : await options.forgeLookup.searchAuthors(source, query),
  findAuthor: async (source, authorId) => {
    if (source.forge !== LOCAL_GIT) return await options.forgeLookup.findAuthor(source, authorId)
    const commitAuthors = await options.readCommitAuthors(source.repositoryPath)
    return commitAuthors.find((author) => author.id === authorId.toLowerCase()) ?? null
  },
})
