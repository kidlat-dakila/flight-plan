import type { Comment, CommentAuthor, CommentThread, Discussion, ForgeAbilities, SubmittedReview } from "@/procedures/get-review/utils/discussion"
import { pullRequestUrlOf } from "@/procedures/get-review/utils/forge-links"
import {
  DONE,
  refused,
  type ForgeOutcome,
  type ForgePullRequest,
  type PullRequestForge,
  type PullRequestReading,
  type ReviewerCandidate,
} from "@/procedures/get-review/utils/pull-request-forge"
import type { Reviewer } from "@/procedures/get-review/utils/review-target-detail"
import type { ForgesChoice } from "@/procedures/get-setup/utils/setup"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { OpenedRepository, RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import {
  GitAdapterError,
  type DiscussionComment,
  type GitAdapter,
  type Person,
  type PullRequestDiscussion,
  type Reviewer as ForgeReviewer,
  type ReviewThread,
  type SubmittedReview as ForgeReview,
  type TargetRef,
} from "@flightplan/git-forge"

const READING_CACHE_MS = 60_000
const UNKNOWN_FAILURE = "The code host could not be reached."
const STORAGE_KEY_SEPARATOR = "\n"

export interface PullRequestForgeDependencies {
  readonly openRepository: RepositoryAdapterOpener
  readonly readForges: () => Promise<ForgesChoice | null>
  readonly now: () => Date
}

interface CachedReading {
  readonly readAt: number
  readonly reading: Promise<PullRequestReading>
}

type AdapterWork<Outcome> = (adapter: GitAdapter, ref: TargetRef) => Promise<Outcome>

const reasonOf = (error: unknown): string => {
  if (error instanceof GitAdapterError) return error.message
  return error instanceof Error && error.message !== "" ? error.message : UNKNOWN_FAILURE
}

const avatarOf = (person: Person): string | null => (person.avatarUrl === "" ? null : person.avatarUrl)

const toAuthor = (person: Person): CommentAuthor => ({ name: person.name ?? person.login, avatarUrl: avatarOf(person) })

const toComment = (comment: DiscussionComment): Comment => ({
  id: comment.id,
  author: toAuthor(comment.author),
  body: comment.body,
  createdAt: new Date(comment.createdAt),
})

const toThread = (thread: ReviewThread): CommentThread => ({
  id: thread.id,
  path: thread.path,
  position: thread.position,
  isResolved: thread.isResolved,
  isOutdated: thread.isOutdated,
  comments: thread.comments.map(toComment),
})

const toReview = (review: ForgeReview): SubmittedReview => ({
  id: review.id,
  author: toAuthor(review.author),
  verdict: review.verdict,
  body: review.body,
  createdAt: new Date(review.submittedAt),
})

const toDiscussion = (discussion: PullRequestDiscussion): Discussion => ({
  comments: discussion.comments.map(toComment),
  threads: discussion.threads.map(toThread),
  reviews: discussion.reviews.map(toReview),
})

const toReviewer = (reviewer: ForgeReviewer): Reviewer => ({
  login: reviewer.login,
  name: reviewer.name ?? reviewer.login,
  avatarUrl: avatarOf(reviewer),
  state: reviewer.state,
})

const toCandidate = (person: Person): ReviewerCandidate => ({
  login: person.login,
  name: person.name ?? person.login,
  avatarUrl: avatarOf(person),
})

const abilitiesOf = (adapter: GitAdapter): ForgeAbilities => ({
  verdicts: adapter.supports("review") ? adapter.reviewVerdicts() : [],
  canReply: adapter.supports("replies"),
  canResolve: adapter.supports("resolution"),
  canRequestReviewers: adapter.supports("reviewRequests"),
  canRequestAgain: adapter.supports("repeatedReviewRequests"),
})

const refOf = (number: number): TargetRef => ({ kind: "pr", number })

const readPullRequest = async (opened: OpenedRepository, adapter: GitAdapter, number: number): Promise<ForgePullRequest> => {
  const ref = refOf(number)
  const [reviewers, discussion, viewer] = await Promise.all([adapter.reviewers(ref), adapter.discussion(ref), adapter.viewer()])
  return {
    url: pullRequestUrlOf(opened.adapterName, opened.forgeSlug, number) ?? "",
    reviewers: reviewers.reviewers.map(toReviewer),
    discussion: toDiscussion(discussion),
    viewer: toAuthor(viewer),
    abilities: abilitiesOf(adapter),
  }
}

const storageKeyOf = (repository: Repository, number: number): string =>
  `${repository.path}${STORAGE_KEY_SEPARATOR}${String(number)}`

const adapterOf = (opened: OpenedRepository): GitAdapter | null => (opened.resolved.ok ? opened.resolved.gitAdapter : null)

export class AdapterPullRequestForge implements PullRequestForge {
  private readonly dependencies: PullRequestForgeDependencies
  private cachedReadings: ReadonlyMap<string, CachedReading> = new Map()

  public constructor(dependencies: PullRequestForgeDependencies) {
    this.dependencies = dependencies
  }

  public readonly read = async (repository: Repository, number: number): Promise<PullRequestReading> => {
    const key = storageKeyOf(repository, number)
    const now = this.dependencies.now().getTime()
    const cached = this.cachedReadings.get(key)
    if (cached !== undefined && now - cached.readAt < READING_CACHE_MS) return await cached.reading
    const reading = this.readFresh(repository, number)
    this.cachedReadings = new Map([...this.cachedReadings, [key, { readAt: now, reading }]])
    return await reading
  }

  public readonly submitReview: PullRequestForge["submitReview"] = async (repository, number, submission) =>
    await this.write(repository, number, async (adapter, ref) => {
      await adapter.submitReview(ref, {
        verdict: submission.verdict,
        body: submission.body,
        comments: submission.comments,
        commitSha: submission.commit,
      })
    })

  public readonly addComment: PullRequestForge["addComment"] = async (repository, number, body) =>
    await this.write(repository, number, async (adapter, ref) => {
      await adapter.addComment(ref, body)
    })

  public readonly reply: PullRequestForge["reply"] = async (repository, number, threadId, body) =>
    await this.write(repository, number, async (adapter, ref) => {
      await adapter.replyToThread(ref, threadId, body)
    })

  public readonly setResolved: PullRequestForge["setResolved"] = async (repository, number, threadId, isResolved) =>
    await this.write(repository, number, async (adapter, ref) => {
      await (isResolved ? adapter.resolveThread(ref, threadId) : adapter.reopenThread(ref, threadId))
    })

  public readonly searchReviewers: PullRequestForge["searchReviewers"] = async (repository, number, query) => {
    try {
      const adapter = adapterOf(await this.open(repository))
      return adapter === null ? [] : (await adapter.searchReviewers(refOf(number), query)).map(toCandidate)
    } catch {
      return []
    }
  }

  public readonly requestReviewer: PullRequestForge["requestReviewer"] = async (repository, number, login) =>
    await this.write(repository, number, async (adapter, ref) => {
      await adapter.requestReviewers(ref, [login])
    })

  public readonly removeReviewRequest: PullRequestForge["removeReviewRequest"] = async (repository, number, login) =>
    await this.write(repository, number, async (adapter, ref) => {
      await adapter.removeReviewRequests(ref, [login])
    })

  private readonly open = async (repository: Repository): Promise<OpenedRepository> =>
    await this.dependencies.openRepository(repository.path, await this.dependencies.readForges())

  private readonly readFresh = async (repository: Repository, number: number): Promise<PullRequestReading> => {
    try {
      const opened = await this.open(repository)
      if (!opened.resolved.ok) return { kind: "unavailable", reason: opened.resolved.error.message }
      const adapter = opened.resolved.gitAdapter
      if (!adapter.supports("discussion")) return { kind: "unavailable", reason: `${adapter.name} has no pull request discussion.` }
      return { kind: "read", pullRequest: await readPullRequest(opened, adapter, number) }
    } catch (error) {
      return { kind: "unavailable", reason: reasonOf(error) }
    }
  }

  private readonly forget = (repository: Repository, number: number): void => {
    const key = storageKeyOf(repository, number)
    this.cachedReadings = new Map([...this.cachedReadings].filter(([cachedKey]) => cachedKey !== key))
  }

  private readonly write = async (repository: Repository, number: number, work: AdapterWork<void>): Promise<ForgeOutcome> => {
    try {
      const opened = await this.open(repository)
      if (!opened.resolved.ok) return refused(opened.resolved.error.message)
      await work(opened.resolved.gitAdapter, refOf(number))
      return DONE
    } catch (error) {
      return refused(reasonOf(error))
    } finally {
      this.forget(repository, number)
    }
  }
}

export const createPullRequestForge = (dependencies: PullRequestForgeDependencies): PullRequestForge =>
  new AdapterPullRequestForge(dependencies)
