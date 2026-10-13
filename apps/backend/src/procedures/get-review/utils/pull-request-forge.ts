import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { DiffPosition } from "@flightplan/git-forge"
import type { Comment, CommentAuthor, CommentThread, Discussion, ForgeAbilities, ReviewVerdict } from "./discussion"
import type { Reviewer, ReviewerState } from "./review-target-detail"

export interface ForgePullRequest {
  readonly url: string
  readonly reviewers: readonly Reviewer[]
  readonly discussion: Discussion
  readonly viewer: CommentAuthor
  readonly abilities: ForgeAbilities
}

export type PullRequestReading
  = | { readonly kind: "read", readonly pullRequest: ForgePullRequest }
    | { readonly kind: "unavailable", readonly reason: string }

export type ForgeOutcome
  = | { readonly kind: "done" }
    | { readonly kind: "refused", readonly reason: string }

export interface ForgeReviewSubmission {
  readonly verdict: ReviewVerdict
  readonly body: string
  readonly comments: readonly { readonly position: DiffPosition, readonly body: string }[]
  readonly commit: string
}

export interface ReviewerCandidate {
  readonly login: string
  readonly name: string
  readonly avatarUrl: string | null
}

export interface PullRequestForge {
  readonly read: (repository: Repository, number: number) => Promise<PullRequestReading>
  readonly submitReview: (repository: Repository, number: number, submission: ForgeReviewSubmission) => Promise<ForgeOutcome>
  readonly addComment: (repository: Repository, number: number, body: string) => Promise<ForgeOutcome>
  readonly reply: (repository: Repository, number: number, threadId: string, body: string) => Promise<ForgeOutcome>
  readonly setResolved: (repository: Repository, number: number, threadId: string, isResolved: boolean) => Promise<ForgeOutcome>
  readonly searchReviewers: (repository: Repository, number: number, query: string) => Promise<readonly ReviewerCandidate[]>
  readonly requestReviewer: (repository: Repository, number: number, login: string) => Promise<ForgeOutcome>
  readonly removeReviewRequest: (repository: Repository, number: number, login: string) => Promise<ForgeOutcome>
}

export interface SamplePullRequest {
  readonly repositoryName: string
  readonly number: number
  readonly url: string
  readonly reviewers: readonly Reviewer[]
  readonly discussion: Discussion
}

export const DONE: ForgeOutcome = { kind: "done" }

export const refused = (reason: string): ForgeOutcome => ({ kind: "refused", reason })

export const SAMPLE_VIEWER: CommentAuthor = { name: "you", avatarUrl: null }

const SAMPLE_ABILITIES: ForgeAbilities = {
  verdicts: ["comment", "approve", "request-changes"],
  canReply: true,
  canResolve: true,
  canRequestReviewers: true,
  canRequestAgain: true,
}

const SAMPLE_PEOPLE: readonly ReviewerCandidate[] = ["amara", "jonas", "lena", "mira", "teo"].map((login) => ({
  login,
  name: login,
  avatarUrl: null,
}))

const NO_SUCH_PULL_REQUEST = "This sample repository has no such pull request."
const NO_SUCH_THREAD = "This comment thread is no longer there."
const STORAGE_KEY_SEPARATOR = "\n"

const REVIEWER_STATES: Readonly<Record<ReviewVerdict, ReviewerState>> = {
  "comment": "commented",
  "approve": "approved",
  "request-changes": "changes-requested",
}

const storageKeyOf = (repositoryName: string, number: number): string =>
  `${repositoryName}${STORAGE_KEY_SEPARATOR}${String(number)}`

const commentCountOf = ({ comments, threads }: Discussion): number =>
  comments.length + threads.reduce((total, thread) => total + thread.comments.length, 0)

const toSampleComment = (discussion: Discussion, offset: number, body: string, now: Date): Comment => ({
  id: `comment-${String(commentCountOf(discussion) + offset + 1)}`,
  author: SAMPLE_VIEWER,
  body,
  createdAt: now,
})

const toSampleThread = (discussion: Discussion, offset: number, position: DiffPosition, body: string, now: Date): CommentThread => ({
  id: `thread-${String(discussion.threads.length + offset + 1)}`,
  path: position.path,
  position,
  isResolved: false,
  isOutdated: false,
  comments: [toSampleComment(discussion, offset, body, now)],
})

const withReview = (discussion: Discussion, submission: ForgeReviewSubmission, now: Date): Discussion => ({
  comments: discussion.comments,
  threads: [
    ...discussion.threads,
    ...submission.comments.map((comment, offset) => toSampleThread(discussion, offset, comment.position, comment.body, now)),
  ],
  reviews: [
    ...discussion.reviews,
    {
      id: `review-${String(discussion.reviews.length + 1)}`,
      author: SAMPLE_VIEWER,
      verdict: submission.verdict,
      body: submission.body,
      createdAt: now,
    },
  ],
})

const withViewerState = (reviewers: readonly Reviewer[], verdict: ReviewVerdict): readonly Reviewer[] => {
  const viewer: Reviewer = { login: SAMPLE_VIEWER.name, name: SAMPLE_VIEWER.name, avatarUrl: null, state: REVIEWER_STATES[verdict] }
  return [...reviewers.filter((reviewer) => reviewer.login !== viewer.login), viewer]
}

const withThread = (discussion: Discussion, threadId: string, change: (thread: CommentThread) => CommentThread): Discussion | null =>
  discussion.threads.some((thread) => thread.id === threadId)
    ? { ...discussion, threads: discussion.threads.map((thread) => (thread.id === threadId ? change(thread) : thread)) }
    : null

export class InMemoryPullRequestForge implements PullRequestForge {
  private pullRequests: ReadonlyMap<string, SamplePullRequest>
  private readonly now: () => Date

  public constructor(pullRequests: readonly SamplePullRequest[], now: () => Date) {
    this.pullRequests = new Map(pullRequests.map((sample) => [storageKeyOf(sample.repositoryName, sample.number), sample]))
    this.now = now
  }

  public readonly read = async (repository: Repository, number: number): Promise<PullRequestReading> => {
    const sample = this.find(repository, number)
    return await Promise.resolve(
      sample === null
        ? { kind: "unavailable", reason: NO_SUCH_PULL_REQUEST }
        : {
            kind: "read",
            pullRequest: {
              url: sample.url,
              reviewers: sample.reviewers,
              discussion: sample.discussion,
              viewer: SAMPLE_VIEWER,
              abilities: SAMPLE_ABILITIES,
            },
          },
    )
  }

  public readonly submitReview = async (
    repository: Repository,
    number: number,
    submission: ForgeReviewSubmission,
  ): Promise<ForgeOutcome> =>
    await this.change(repository, number, (sample) => ({
      ...sample,
      discussion: withReview(sample.discussion, submission, this.now()),
      reviewers: withViewerState(sample.reviewers, submission.verdict),
    }))

  public readonly addComment = async (repository: Repository, number: number, body: string): Promise<ForgeOutcome> =>
    await this.change(repository, number, (sample) => ({
      ...sample,
      discussion: {
        ...sample.discussion,
        comments: [...sample.discussion.comments, toSampleComment(sample.discussion, 0, body, this.now())],
      },
    }))

  public readonly reply = async (repository: Repository, number: number, threadId: string, body: string): Promise<ForgeOutcome> =>
    await this.changeThread(repository, number, threadId, (thread, discussion) => ({
      ...thread,
      comments: [...thread.comments, toSampleComment(discussion, 0, body, this.now())],
    }))

  public readonly setResolved = async (
    repository: Repository,
    number: number,
    threadId: string,
    isResolved: boolean,
  ): Promise<ForgeOutcome> =>
    await this.changeThread(repository, number, threadId, (thread) => ({ ...thread, isResolved }))

  public readonly searchReviewers = async (
    repository: Repository,
    number: number,
    query: string,
  ): Promise<readonly ReviewerCandidate[]> => {
    const typedText = query.trim().toLowerCase()
    return await Promise.resolve(
      this.find(repository, number) === null ? [] : SAMPLE_PEOPLE.filter((person) => person.login.includes(typedText)),
    )
  }

  public readonly requestReviewer = async (repository: Repository, number: number, login: string): Promise<ForgeOutcome> =>
    await this.change(repository, number, (sample) => ({
      ...sample,
      reviewers: [
        ...sample.reviewers.filter((reviewer) => reviewer.login !== login),
        { login, name: login, avatarUrl: null, state: "pending" },
      ],
    }))

  public readonly removeReviewRequest = async (repository: Repository, number: number, login: string): Promise<ForgeOutcome> =>
    await this.change(repository, number, (sample) => ({
      ...sample,
      reviewers: sample.reviewers.filter((reviewer) => reviewer.login !== login),
    }))

  private readonly find = (repository: Repository, number: number): SamplePullRequest | null =>
    this.pullRequests.get(storageKeyOf(repository.name, number)) ?? null

  private readonly change = async (
    repository: Repository,
    number: number,
    amend: (sample: SamplePullRequest) => SamplePullRequest | null,
  ): Promise<ForgeOutcome> => {
    const sample = this.find(repository, number)
    if (sample === null) return await Promise.resolve(refused(NO_SUCH_PULL_REQUEST))
    const amended = amend(sample)
    if (amended === null) return await Promise.resolve(refused(NO_SUCH_THREAD))
    this.pullRequests = new Map([...this.pullRequests, [storageKeyOf(repository.name, number), amended]])
    return await Promise.resolve(DONE)
  }

  private readonly changeThread = async (
    repository: Repository,
    number: number,
    threadId: string,
    amend: (thread: CommentThread, discussion: Discussion) => CommentThread,
  ): Promise<ForgeOutcome> =>
    await this.change(repository, number, (sample) => {
      const discussion = withThread(sample.discussion, threadId, (thread) => amend(thread, sample.discussion))
      return discussion === null ? null : { ...sample, discussion }
    })
}
