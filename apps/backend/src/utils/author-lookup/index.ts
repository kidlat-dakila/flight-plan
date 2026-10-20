import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"
import type { AuthorSearchResult, AuthorSource, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { matchUsers } from "@/procedures/search-repository-authors/utils/match-users"
import type { CommitAuthorReader } from "@/utils/commit-author-reader"
import { problemOf, type RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { normalizeLogin, type GitAdapter, type Person } from "@flightplan/git-forge"

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

const viewerLoginOf = async (gitAdapter: GitAdapter): Promise<string | null> => {
  try {
    return normalizeLogin((await gitAdapter.viewer()).login)
  } catch {
    return null
  }
}

const isNotViewer = (viewerLogin: string | null) => (person: Person): boolean =>
  viewerLogin === null || normalizeLogin(person.login) !== viewerLogin

const searchPeopleExceptViewer = async (gitAdapter: GitAdapter, query: string): Promise<Person[]> => {
  const [people, viewerLogin] = await Promise.all([gitAdapter.searchPeople(query), viewerLoginOf(gitAdapter)])
  return people.filter(isNotViewer(viewerLogin))
}

type PeopleSearch = (gitAdapter: GitAdapter, query: string) => Promise<Person[]>

const searchAllPeople: PeopleSearch = async (gitAdapter, query) => await gitAdapter.searchPeople(query)

export const createAuthorLookup = (
  options: AuthorLookupOptions,
): Pick<SetupEnvironment, "searchAuthors" | "findAuthor"> => {
  const searchForge = async (source: AuthorSource, query: string, searchPeople: PeopleSearch): Promise<AuthorSearchResult> => {
    const opened = await options.openRepository(source.repositoryPath, source.forges)
    if (!opened.resolved.ok) return { authors: [], problem: opened.resolved.error.problem }
    try {
      const people = await searchPeople(opened.resolved.gitAdapter, query)
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
      source.forge === LOCAL_GIT ? await searchLocalGit(source.repositoryPath, query) : await searchForge(source, query, searchPeopleExceptViewer),
    findAuthor: async (source, authorId) => {
      if (source.forge !== LOCAL_GIT) {
        const { authors } = await searchForge(source, normalizeLogin(authorId), searchAllPeople)
        return authors.find((author) => normalizeLogin(author.id) === normalizeLogin(authorId)) ?? null
      }
      const commitAuthors = await options.readCommitAuthors(source.repositoryPath)
      return commitAuthors.find((author) => author.id === authorId.toLowerCase()) ?? null
    },
  }
}
