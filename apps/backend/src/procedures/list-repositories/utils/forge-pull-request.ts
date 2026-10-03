import type { PullRequestHistory } from "@/utils/git-adapter/types"

export type PullRequestState = PullRequestHistory["state"]

export interface ForgePerson {
  readonly login: string
  readonly avatarUrl: string | null
}

export interface ForgeActivity {
  readonly login: string
  readonly at: Date
}

export interface ForgePullRequest {
  readonly number: number
  readonly title: string
  readonly headBranch: string
  readonly state: PullRequestState
  readonly isDraft: boolean
  readonly author: ForgePerson
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly requestedReviewerLogins: readonly string[]
  readonly discussionActivity: readonly ForgeActivity[]
  readonly commitDates: readonly Date[]
}

export interface ForgeSnapshot {
  readonly viewerLogin: string
  readonly pullRequests: readonly ForgePullRequest[]
}

export const PULL_REQUESTS_PER_AUTHOR = 15

const toDate = (isoDate: string): Date => new Date(isoDate)

export const toForgePullRequest = (history: PullRequestHistory): ForgePullRequest => ({
  number: history.number,
  title: history.title,
  headBranch: history.headBranch,
  state: history.state,
  isDraft: history.isDraft,
  author: { login: history.author.login, avatarUrl: history.author.avatarUrl === "" ? null : history.author.avatarUrl },
  createdAt: toDate(history.createdAt),
  updatedAt: toDate(history.updatedAt),
  requestedReviewerLogins: history.requestedReviewers,
  discussionActivity: history.discussion.map((activity) => ({ login: activity.login, at: toDate(activity.at) })),
  commitDates: history.commitDates.map(toDate),
})
