import type { CodeHighlighter } from "@/procedures/get-review/utils/code/highlighter"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { InMemorySetupStore, type SetupStore } from "@/procedures/get-setup/utils/setup-store"
import { createMockRepositories } from "@/procedures/list-repositories/utils/mock-repositories"
import { InMemoryRepositoryStore, type RepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { createCodeHighlighter } from "@/utils/code-highlighter"

export interface ProcedureContext {
  readonly repositoryStore: RepositoryStore
  readonly reviewStore: ReviewStore
  readonly setupStore: SetupStore
  readonly setupEnvironment: SetupEnvironment
  readonly highlightCode: CodeHighlighter
  readonly now: () => Date
  readonly dataNotice: string | null
}

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockProcedureContext = (startedAt: Date): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt)),
  reviewStore: new InMemoryReviewStore(createMockReviews(startedAt)),
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  highlightCode: createCodeHighlighter(),
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})
