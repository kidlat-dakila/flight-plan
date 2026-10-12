import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { EMPTY_DISCUSSION, type ChatQuestion, type Discussion, type Publication } from "./discussion"
import type { ReviewTargetDetail } from "./review-target-detail"
import type { ReviewRequest } from "./start/review-request"
import type { ReviewScaffold } from "./stored-review"

export interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface ArtifactAmendment<Outcome> {
  readonly artifact: ReviewArtifact | null
  readonly outcome: Outcome
}

export type ArtifactAmend<Outcome> = (artifact: ReviewArtifact) => ArtifactAmendment<Outcome>

export interface ReviewStore {
  readonly findArtifact: (key: ReviewKey) => Promise<ReviewArtifact | null>
  readonly listTargetIds: (repositoryName: string) => Promise<readonly string[]>
  readonly findTargetDetail: (key: ReviewKey) => Promise<ReviewTargetDetail | null>
  readonly readReviewedMarks: (key: ReviewKey) => Promise<ReviewedMarks>
  readonly writeReviewedMarks: (key: ReviewKey, marks: ReviewedMarks) => Promise<void>
  readonly readDiscussion: (key: ReviewKey) => Promise<Discussion>
  readonly writeDiscussion: (key: ReviewKey, discussion: Discussion) => Promise<void>
  readonly readPublications: (key: ReviewKey) => Promise<readonly Publication[]>
  readonly writePublications: (key: ReviewKey, publications: readonly Publication[]) => Promise<void>
  readonly readChatQuestions: (key: ReviewKey) => Promise<readonly ChatQuestion[]>
  readonly writeChatQuestions: (key: ReviewKey, questions: readonly ChatQuestion[]) => Promise<void>
  readonly findRequest: (key: ReviewKey) => Promise<ReviewRequest | null>
  readonly writeScaffold: (key: ReviewKey, scaffold: ReviewScaffold) => Promise<void>
  readonly deleteScaffold: (key: ReviewKey) => Promise<void>
  readonly amendArtifact: <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>) => Promise<Outcome | null>
}

export interface StoredReview {
  readonly key: ReviewKey
  readonly artifact: ReviewArtifact | null
  readonly detail: ReviewTargetDetail
  readonly discussion: Discussion
}

const STORAGE_KEY_SEPARATOR = "\n"

const storageKeyOf = (key: ReviewKey): string => `${key.repositoryName}${STORAGE_KEY_SEPARATOR}${key.targetId}`

const targetIdsIn = (storageKeys: Iterable<string>, repositoryName: string): readonly string[] => {
  const prefix = `${repositoryName}${STORAGE_KEY_SEPARATOR}`
  return [...storageKeys].filter((storageKey) => storageKey.startsWith(prefix)).map((storageKey) => storageKey.slice(prefix.length))
}

const withoutEntry = <Stored>(entries: ReadonlyMap<string, Stored>, key: ReviewKey): ReadonlyMap<string, Stored> =>
  new Map([...entries].filter(([storageKey]) => storageKey !== storageKeyOf(key)))

const withEntry = <Stored>(entries: ReadonlyMap<string, Stored>, key: ReviewKey, stored: Stored): ReadonlyMap<string, Stored> =>
  new Map([...entries, [storageKeyOf(key), stored]])

export class InMemoryReviewStore implements ReviewStore {
  private reviews: ReadonlyMap<string, StoredReview>
  private marks: ReadonlyMap<string, ReviewedMarks> = new Map()
  private discussions: ReadonlyMap<string, Discussion>
  private publications: ReadonlyMap<string, readonly Publication[]> = new Map()
  private chatQuestions: ReadonlyMap<string, readonly ChatQuestion[]> = new Map()
  private scaffolds: ReadonlyMap<string, ReviewScaffold> = new Map()
  private amendedArtifacts: ReadonlyMap<string, ReviewArtifact> = new Map()

  public constructor(reviews: readonly StoredReview[]) {
    this.reviews = new Map(reviews.map((review) => [storageKeyOf(review.key), review]))
    this.discussions = new Map(reviews.map((review) => [storageKeyOf(review.key), review.discussion]))
  }

  public readonly findArtifact = async (key: ReviewKey): Promise<ReviewArtifact | null> =>
    await Promise.resolve(
      this.amendedArtifacts.get(storageKeyOf(key))
      ?? this.scaffolds.get(storageKeyOf(key))?.artifact
      ?? this.reviews.get(storageKeyOf(key))?.artifact
      ?? null,
    )

  public readonly listTargetIds = async (repositoryName: string): Promise<readonly string[]> =>
    await Promise.resolve(targetIdsIn(this.scaffolds.keys(), repositoryName))

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

  public readonly findRequest = async (key: ReviewKey): Promise<ReviewRequest | null> =>
    await Promise.resolve(this.scaffolds.get(storageKeyOf(key))?.request ?? null)

  public readonly writeScaffold = async (key: ReviewKey, scaffold: ReviewScaffold): Promise<void> => {
    this.scaffolds = withEntry(this.scaffolds, key, scaffold)
    this.amendedArtifacts = withEntry(this.amendedArtifacts, key, scaffold.artifact)
    await Promise.resolve()
  }

  public readonly deleteScaffold = async (key: ReviewKey): Promise<void> => {
    const sample = this.reviews.get(storageKeyOf(key))
    if (sample !== undefined) this.reviews = withEntry(this.reviews, key, { ...sample, artifact: null })
    this.scaffolds = withoutEntry(this.scaffolds, key)
    this.amendedArtifacts = withoutEntry(this.amendedArtifacts, key)
    await Promise.resolve()
  }

  public readonly amendArtifact = async <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>): Promise<Outcome | null> => {
    const artifact = await this.findArtifact(key)
    if (artifact === null) return null
    const amendment = amend(artifact)
    if (amendment.artifact !== null) this.amendedArtifacts = withEntry(this.amendedArtifacts, key, amendment.artifact)
    return amendment.outcome
  }
}
