import type { Repository } from "./repository"

export interface RepositoryStore {
  readonly list: () => Promise<readonly Repository[]>
  readonly add: (repository: Repository) => Promise<void>
  readonly replace: (repository: Repository) => Promise<void>
}

export class InMemoryRepositoryStore implements RepositoryStore {
  private repositories: readonly Repository[]

  public constructor(repositories: readonly Repository[]) {
    this.repositories = repositories
  }

  public readonly list = async (): Promise<readonly Repository[]> => await Promise.resolve(this.repositories)

  public readonly replace = async (repository: Repository): Promise<void> => {
    this.repositories = this.repositories.map((stored) => (stored.name === repository.name ? repository : stored))
    await Promise.resolve()
  }

  public readonly add = async (repository: Repository): Promise<void> => {
    this.repositories = [...this.repositories, repository]
    await Promise.resolve()
  }
}
