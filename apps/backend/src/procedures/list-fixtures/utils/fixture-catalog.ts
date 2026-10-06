import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { ReviewArtifact } from "@flightplan/configurations"

export interface FixtureCatalog {
  readonly listCaseNames: () => Promise<readonly string[]>
  readonly readRepository: (caseName: string) => Promise<Repository>
  readonly readArtifact: (caseName: string, snapshotName: string) => Promise<ReviewArtifact>
}

export interface FixtureCase {
  readonly repository: Repository
  readonly artifactsBySnapshotName: ReadonlyMap<string, ReviewArtifact>
}

export class UnknownFixtureCaseError extends Error {
  public constructor(caseName: string) {
    super(`The fixture catalog has no case named ${caseName}.`)
    this.name = "UnknownFixtureCaseError"
  }
}

export class UnknownFixtureSnapshotError extends Error {
  public constructor(caseName: string, snapshotName: string) {
    super(`The fixture case ${caseName} has no snapshot named ${snapshotName}.`)
    this.name = "UnknownFixtureSnapshotError"
  }
}

const NO_ARTIFACTS: ReadonlyMap<string, ReviewArtifact> = new Map()

export const fixtureCaseOf = (repository: Repository): FixtureCase => ({ repository, artifactsBySnapshotName: NO_ARTIFACTS })

export const createInMemoryFixtureCatalog = (cases: readonly FixtureCase[]): FixtureCatalog => {
  const findCase = (caseName: string): FixtureCase => {
    const fixtureCase = cases.find((candidate) => candidate.repository.name === caseName)
    if (fixtureCase === undefined) throw new UnknownFixtureCaseError(caseName)
    return fixtureCase
  }
  return {
    listCaseNames: async () => await Promise.resolve(cases.map((fixtureCase) => fixtureCase.repository.name)),
    readRepository: async (caseName) => await Promise.resolve(findCase(caseName).repository),
    readArtifact: async (caseName, snapshotName) => {
      const artifact = findCase(caseName).artifactsBySnapshotName.get(snapshotName)
      if (artifact === undefined) throw new UnknownFixtureSnapshotError(caseName, snapshotName)
      return await Promise.resolve(artifact)
    },
  }
}
