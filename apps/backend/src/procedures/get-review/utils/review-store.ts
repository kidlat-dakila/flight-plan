import type { ImportRequest } from "@/procedures/import-review/utils/import-request"
import type { ReviewArtifact } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@flightplan/reviewed-marks"
import type { PendingComment, Publication, PublishingRequest } from "./discussion"
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
  readonly readPendingComments: (key: ReviewKey) => Promise<readonly PendingComment[]>
  readonly writePendingComments: (key: ReviewKey, pendingComments: readonly PendingComment[]) => Promise<void>
  readonly readPublications: (key: ReviewKey) => Promise<readonly Publication[]>
  readonly writePublications: (key: ReviewKey, publications: readonly Publication[]) => Promise<void>
  readonly readPublishingRequest: (key: ReviewKey) => Promise<PublishingRequest | null>
  readonly writePublishingRequest: (key: ReviewKey, request: PublishingRequest | null) => Promise<void>
  readonly readImportRequest: (key: ReviewKey) => Promise<ImportRequest | null>
  readonly writeImportRequest: (key: ReviewKey, request: ImportRequest) => Promise<void>
  readonly findRequest: (key: ReviewKey) => Promise<ReviewRequest | null>
  readonly readScaffold: (key: ReviewKey) => Promise<ReviewScaffold | null>
  readonly writeScaffold: (key: ReviewKey, scaffold: ReviewScaffold) => Promise<void>
  readonly deleteScaffold: (key: ReviewKey) => Promise<void>
  readonly moveScaffold: (from: ReviewKey, to: ReviewKey) => Promise<boolean>
  readonly amendArtifact: <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>) => Promise<Outcome | null>
}

export interface StoredReview {
  readonly key: ReviewKey
  readonly artifact: ReviewArtifact | null
  readonly detail: ReviewTargetDetail
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
  private pendingComments: ReadonlyMap<string, readonly PendingComment[]> = new Map()
  private publications: ReadonlyMap<string, readonly Publication[]> = new Map()
  private publishingRequests: ReadonlyMap<string, PublishingRequest | null> = new Map()
  private importRequests: ReadonlyMap<string, ImportRequest> = new Map()
  private scaffolds: ReadonlyMap<string, ReviewScaffold> = new Map()
  private amendedArtifacts: ReadonlyMap<string, ReviewArtifact> = new Map()

  public constructor(reviews: readonly StoredReview[]) {
    this.reviews = new Map(reviews.map((review) => [storageKeyOf(review.key), review]))
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

  public readonly readPendingComments = async (key: ReviewKey): Promise<readonly PendingComment[]> =>
    await Promise.resolve(this.pendingComments.get(storageKeyOf(key)) ?? [])

  public readonly writePendingComments = async (key: ReviewKey, pendingComments: readonly PendingComment[]): Promise<void> => {
    this.pendingComments = withEntry(this.pendingComments, key, pendingComments)
    await Promise.resolve()
  }

  public readonly readPublications = async (key: ReviewKey): Promise<readonly Publication[]> =>
    await Promise.resolve(this.publications.get(storageKeyOf(key)) ?? [])

  public readonly writePublications = async (key: ReviewKey, publications: readonly Publication[]): Promise<void> => {
    this.publications = withEntry(this.publications, key, publications)
    await Promise.resolve()
  }

  public readonly readPublishingRequest = async (key: ReviewKey): Promise<PublishingRequest | null> =>
    await Promise.resolve(this.publishingRequests.get(storageKeyOf(key)) ?? null)

  public readonly writePublishingRequest = async (key: ReviewKey, request: PublishingRequest | null): Promise<void> => {
    this.publishingRequests = withEntry(this.publishingRequests, key, request)
    await Promise.resolve()
  }

  public readonly readImportRequest = async (key: ReviewKey): Promise<ImportRequest | null> =>
    await Promise.resolve(this.importRequests.get(storageKeyOf(key)) ?? null)

  public readonly writeImportRequest = async (key: ReviewKey, request: ImportRequest): Promise<void> => {
    this.importRequests = withEntry(this.importRequests, key, request)
    await Promise.resolve()
  }

  public readonly findRequest = async (key: ReviewKey): Promise<ReviewRequest | null> =>
    await Promise.resolve(this.scaffolds.get(storageKeyOf(key))?.request ?? null)

  public readonly readScaffold = async (key: ReviewKey): Promise<ReviewScaffold | null> => {
    const scaffold = this.scaffolds.get(storageKeyOf(key))
    const artifact = this.amendedArtifacts.get(storageKeyOf(key))
    return await Promise.resolve(scaffold === undefined ? null : { ...scaffold, artifact: artifact ?? scaffold.artifact })
  }

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

  public readonly moveScaffold = async (from: ReviewKey, to: ReviewKey): Promise<boolean> => {
    const scaffold = this.scaffolds.get(storageKeyOf(from))
    const artifact = this.amendedArtifacts.get(storageKeyOf(from))
    if (scaffold === undefined || artifact === undefined) return await Promise.resolve(false)
    this.scaffolds = withEntry(withoutEntry(this.scaffolds, from), to, scaffold)
    this.amendedArtifacts = withEntry(withoutEntry(this.amendedArtifacts, from), to, artifact)
    return await Promise.resolve(true)
  }

  public readonly amendArtifact = async <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>): Promise<Outcome | null> => {
    const artifact = await this.findArtifact(key)
    if (artifact === null) return null
    const amendment = amend(artifact)
    if (amendment.artifact !== null) this.amendedArtifacts = withEntry(this.amendedArtifacts, key, amendment.artifact)
    return amendment.outcome
  }
}
