import { createMockRepositories } from "@/repository/mock-repositories"
import { InMemoryRepositoryStore, type RepositoryStore } from "@/repository/repository-store"

export interface TrpcContext {
  readonly repositoryStore: RepositoryStore
  readonly now: () => Date
  readonly dataNotice: string | null
}

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockTrpcContext = (startedAt: Date): TrpcContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt)),
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})
