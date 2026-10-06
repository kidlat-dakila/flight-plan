import type { Repository } from "@/procedures/list-repositories/utils/repository"

export interface FixtureCatalog {
  readonly listCaseNames: () => Promise<readonly string[]>
  readonly readRepository: (caseName: string) => Promise<Repository>
}

export class UnknownFixtureCaseError extends Error {
  public constructor(caseName: string) {
    super(`The fixture catalog has no case named ${caseName}.`)
    this.name = "UnknownFixtureCaseError"
  }
}

export const createInMemoryFixtureCatalog = (repositories: readonly Repository[]): FixtureCatalog => ({
  listCaseNames: async () => await Promise.resolve(repositories.map((repository) => repository.name)),
  readRepository: async (caseName) => {
    const repository = repositories.find((candidate) => candidate.name === caseName)
    if (repository === undefined) throw new UnknownFixtureCaseError(caseName)
    return await Promise.resolve(repository)
  },
})
