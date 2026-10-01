import { EMPTY_DISCUSSION, type ChatQuestion, type Discussion, type Publication } from "./discussion"
import type { ReviewArtifact, ReviewTargetDetail } from "./review-artifact"

export interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface ReviewedMarks {
  readonly waypoints: Readonly<Record<string, string>>
  readonly files: Readonly<Record<string, string>>
}

export const NO_REVIEWED_MARKS: ReviewedMarks = { waypoints: {}, files: {} }

export interface ReviewStore {
  readonly findArtifact: (key: ReviewKey) => Promise<ReviewArtifact | null>
  readonly findTargetDetail: (key: ReviewKey) => Promise<ReviewTargetDetail | null>
  readonly readReviewedMarks: (key: ReviewKey) => Promise<ReviewedMarks>
  readonly writeReviewedMarks: (key: ReviewKey, marks: ReviewedMarks) => Promise<void>
  readonly readDiscussion: (key: ReviewKey) => Promise<Discussion>
  readonly writeDiscussion: (key: ReviewKey, discussion: Discussion) => Promise<void>
  readonly readPublications: (key: ReviewKey) => Promise<readonly Publication[]>
  readonly writePublications: (key: ReviewKey, publications: readonly Publication[]) => Promise<void>
  readonly readChatQuestions: (key: ReviewKey) => Promise<readonly ChatQuestion[]>
  readonly writeChatQuestions: (key: ReviewKey, questions: readonly ChatQuestion[]) => Promise<void>
}

export interface StoredReview {
  readonly key: ReviewKey
  readonly artifact: ReviewArtifact | null
  readonly detail: ReviewTargetDetail
  readonly discussion: Discussion
}

const storageKeyOf = (key: ReviewKey): string => `${key.repositoryName}\n${key.targetId}`

const withEntry = <Stored>(entries: ReadonlyMap<string, Stored>, key: ReviewKey, stored: Stored): ReadonlyMap<string, Stored> =>
  new Map([...entries, [storageKeyOf(key), stored]])

export class InMemoryReviewStore implements ReviewStore {
  private readonly reviews: ReadonlyMap<string, StoredReview>
  private marks: ReadonlyMap<string, ReviewedMarks> = new Map()
  private discussions: ReadonlyMap<string, Discussion>
  private publications: ReadonlyMap<string, readonly Publication[]> = new Map()
  private chatQuestions: ReadonlyMap<string, readonly ChatQuestion[]> = new Map()

  public constructor(reviews: readonly StoredReview[]) {
    this.reviews = new Map(reviews.map((review) => [storageKeyOf(review.key), review]))
    this.discussions = new Map(reviews.map((review) => [storageKeyOf(review.key), review.discussion]))
  }

  public readonly findArtifact = async (key: ReviewKey): Promise<ReviewArtifact | null> =>
    await Promise.resolve(this.reviews.get(storageKeyOf(key))?.artifact ?? null)

  public readonly findTargetDetail = async (key: ReviewKey): Promise<ReviewTargetDetail | null> =>
    await Promise.resolve(this.reviews.get(storageKeyOf(key))?.detail ?? null)

  public readonly readReviewedMarks = async (key: ReviewKey): Promise<ReviewedMarks> =>
    await Promise.resolve(this.marks.get(storageKeyOf(key)) ?? NO_REVIEWED_MARKS)

  public readonly writeReviewedMarks = async (key: ReviewKey, marks: ReviewedMarks): Promise<void> => {
    this.marks = withEntry(this.marks, key, marks)
    await Promise.resolve()
  }

  public readonly readDiscussion = async (key: ReviewKey): Promise<Discussion> =>
    await Promise.resolve(this.discussions.get(storageKeyOf(key)) ?? EMPTY_DISCUSSION)

  public readonly writeDiscussion = async (key: ReviewKey, discussion: Discussion): Promise<void> => {
    this.discussions = withEntry(this.discussions, key, discussion)
    await Promise.resolve()
  }

  public readonly readPublications = async (key: ReviewKey): Promise<readonly Publication[]> =>
    await Promise.resolve(this.publications.get(storageKeyOf(key)) ?? [])

  public readonly writePublications = async (key: ReviewKey, publications: readonly Publication[]): Promise<void> => {
    this.publications = withEntry(this.publications, key, publications)
    await Promise.resolve()
  }

  public readonly readChatQuestions = async (key: ReviewKey): Promise<readonly ChatQuestion[]> =>
    await Promise.resolve(this.chatQuestions.get(storageKeyOf(key)) ?? [])

  public readonly writeChatQuestions = async (key: ReviewKey, questions: readonly ChatQuestion[]): Promise<void> => {
    this.chatQuestions = withEntry(this.chatQuestions, key, questions)
    await Promise.resolve()
  }
}
