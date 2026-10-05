import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"
import type { AuthorSearchResult, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { matchUsers } from "@/procedures/search-repository-authors/utils/match-users"
import type { CommitAuthorReader } from "@/utils/commit-author-reader"
import { problemOf, type RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { normalizeLogin, type Person } from "@flightplan/git-forge"

const LOCAL_GIT = "git"
const HANDLE_PREFIX = "@"

export interface AuthorLookupOptions {
  readonly readCommitAuthors: CommitAuthorReader
  readonly openRepository: RepositoryAdapterOpener
}

const toRepositoryAuthor = (person: Person): RepositoryAuthor => ({
  id: `${HANDLE_PREFIX}${person.login}`,
  name: person.name ?? person.login,
  detail: `${HANDLE_PREFIX}${person.login}`,
  avatarUrl: person.avatarUrl === "" ? null : person.avatarUrl,
})

export const createAuthorLookup = (
  options: AuthorLookupOptions,
): Pick<SetupEnvironment, "searchAuthors" | "findAuthor"> => {
  const searchForge: SetupEnvironment["searchAuthors"] = async (source, query) => {
    const opened = await options.openRepository(source.repositoryPath, source.forges)
    if (!opened.resolved.ok) return { authors: [], problem: opened.resolved.error.problem }
    try {
      const people = await opened.resolved.gitAdapter.searchPeople(query)
      return { authors: people.map(toRepositoryAuthor), problem: null }
    } catch (error) {
      return { authors: [], problem: problemOf(error) }
    }
  }
  const searchLocalGit = async (repositoryPath: string, query: string): Promise<AuthorSearchResult> => ({
    authors: matchUsers(await options.readCommitAuthors(repositoryPath), query),
    problem: null,
  })
  return {
    searchAuthors: async (source, query) =>
      source.forge === LOCAL_GIT ? await searchLocalGit(source.repositoryPath, query) : await searchForge(source, query),
    findAuthor: async (source, authorId) => {
      if (source.forge !== LOCAL_GIT) {
        const { authors } = await searchForge(source, normalizeLogin(authorId))
        return authors.find((author) => normalizeLogin(author.id) === normalizeLogin(authorId)) ?? null
      }
      const commitAuthors = await options.readCommitAuthors(source.repositoryPath)
      return commitAuthors.find((author) => author.id === authorId.toLowerCase()) ?? null
    },
  }
}
