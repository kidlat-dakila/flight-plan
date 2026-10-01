import type { CodeHighlighter } from "@/procedures/get-review/utils/code/highlighter"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockRepositories } from "@/procedures/list-repositories/utils/mock-repositories"
import { InMemoryRepositoryStore, type RepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { createCodeHighlighter } from "@/utils/code-highlighter"

export interface ProcedureContext {
  readonly repositoryStore: RepositoryStore
  readonly reviewStore: ReviewStore
  readonly highlightCode: CodeHighlighter
  readonly now: () => Date
  readonly dataNotice: string | null
}

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockProcedureContext = (startedAt: Date): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt)),
  reviewStore: new InMemoryReviewStore(createMockReviews(startedAt)),
  highlightCode: createCodeHighlighter(),
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})
