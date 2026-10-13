import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { dismissNewTarget } from "@/procedures/dismiss-new-target/utils/dismiss-new-target"
import type { Repository } from "./repository"

export interface RepositoryStore {
  readonly notice: string | null
  readonly list: () => Promise<readonly Repository[]>
  readonly listRegistered: () => Promise<readonly ListedRepository[]>
  readonly add: (repository: Repository, authors: SelectedAuthors) => Promise<void>
  readonly readAuthors: (repositoryName: string) => Promise<SelectedAuthors | null>
  readonly readViewerLogin: (repositoryName: string) => Promise<string | null>
  readonly refresh: (repositoryName: string) => Promise<void>
  readonly replaceAuthors: (repositoryName: string, authors: SelectedAuthors) => Promise<boolean>
  readonly remove: (repositoryName: string) => Promise<boolean>
  readonly dismissNewTarget: (repositoryName: string, targetId: string) => Promise<Repository | null>
}

const NO_AUTHORS: SelectedAuthors = { selfAuthor: null, trackedAuthors: [] }

const hasFollowedAuthors = (authors: SelectedAuthors): boolean =>
  authors.selfAuthor !== null || authors.trackedAuthors.length > 0

export class InMemoryRepositoryStore implements RepositoryStore {
  public readonly notice: string | null
  private readonly viewerLogin: string | null
  private repositories: readonly Repository[]
  private authorsByName: ReadonlyMap<string, SelectedAuthors> = new Map()

  public constructor(repositories: readonly Repository[], notice: string | null = null, viewerLogin: string | null = null) {
    this.repositories = repositories
    this.notice = notice
    this.viewerLogin = viewerLogin
  }

  public readonly list = async (): Promise<readonly Repository[]> => await Promise.resolve(this.repositories)

  public readonly listRegistered = async (): Promise<readonly ListedRepository[]> =>
    await Promise.resolve(this.repositories.map(({ name, path }) => ({ name, path })))

  public readonly add = async (repository: Repository, authors: SelectedAuthors): Promise<void> => {
    this.repositories = [...this.repositories, { ...repository, hasFollowedAuthors: hasFollowedAuthors(authors) }]
    this.authorsByName = new Map([...this.authorsByName, [repository.name, authors]])
    await Promise.resolve()
  }

  public readonly readAuthors = async (repositoryName: string): Promise<SelectedAuthors | null> => {
    const isHeld = this.repositories.some((repository) => repository.name === repositoryName)
    return await Promise.resolve(isHeld ? (this.authorsByName.get(repositoryName) ?? NO_AUTHORS) : null)
  }

  public readonly readViewerLogin = async (): Promise<string | null> => await Promise.resolve(this.viewerLogin)

  public readonly refresh = async (): Promise<void> => {
    await Promise.resolve()
  }

  public readonly replaceAuthors = async (repositoryName: string, authors: SelectedAuthors): Promise<boolean> => {
    if (!this.repositories.some((repository) => repository.name === repositoryName)) return await Promise.resolve(false)
    this.repositories = this.repositories.map((repository) =>
      repository.name === repositoryName ? { ...repository, hasFollowedAuthors: hasFollowedAuthors(authors) } : repository,
    )
    this.authorsByName = new Map([...this.authorsByName, [repositoryName, authors]])
    return await Promise.resolve(true)
  }

  public readonly remove = async (repositoryName: string): Promise<boolean> => {
    if (!this.repositories.some((repository) => repository.name === repositoryName)) return await Promise.resolve(false)
    this.repositories = this.repositories.filter((repository) => repository.name !== repositoryName)
    this.authorsByName = new Map([...this.authorsByName].filter(([name]) => name !== repositoryName))
    return await Promise.resolve(true)
  }

  public readonly dismissNewTarget = async (repositoryName: string, targetId: string): Promise<Repository | null> => {
    const repository = dismissNewTarget(this.repositories, repositoryName, targetId)
    if (repository !== null) {
      this.repositories = this.repositories.map((stored) => (stored.name === repository.name ? repository : stored))
    }
    return await Promise.resolve(repository)
  }
}
