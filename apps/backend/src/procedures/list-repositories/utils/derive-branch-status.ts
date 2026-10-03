import type { ForgeActivity, ForgePullRequest } from "./forge-pull-request"
import type { BranchStatus } from "./repository"

const isSameLogin = (first: string, second: string): boolean => first.toLowerCase() === second.toLowerCase()

const isAuthor = (pullRequest: ForgePullRequest, login: string): boolean => isSameLogin(pullRequest.author.login, login)

const reviewerLoginsOf = (pullRequest: ForgePullRequest, viewerLogin: string): readonly string[] =>
  isAuthor(pullRequest, viewerLogin)
    ? [...pullRequest.requestedReviewerLogins, ...pullRequest.discussionActivity.map((activity) => activity.login)]
        .filter((login) => !isAuthor(pullRequest, login))
    : [viewerLogin]

const isByAny = (activity: ForgeActivity, logins: readonly string[]): boolean =>
  logins.some((login) => isSameLogin(login, activity.login))

const isAfter = (date: Date, time: number): boolean => date.getTime() > time

export const deriveBranchStatus = (pullRequest: ForgePullRequest, viewerLogin: string): BranchStatus => {
  if (pullRequest.state === "merged") return "merged"
  if (pullRequest.state === "closed") return "closed"
  if (pullRequest.isDraft) return "draft"
  const reviewerLogins = reviewerLoginsOf(pullRequest, viewerLogin)
  const reviewTimes = pullRequest.discussionActivity
    .filter((activity) => isByAny(activity, reviewerLogins))
    .map((activity) => activity.at.getTime())
  if (reviewTimes.length === 0) return "no-review"
  const lastReviewTime = Math.max(...reviewTimes)
  if (pullRequest.commitDates.some((date) => isAfter(date, lastReviewTime))) return "awaiting-review"
  const hasAuthorReplied = pullRequest.discussionActivity.some(
    (activity) => isAuthor(pullRequest, activity.login) && isAfter(activity.at, lastReviewTime),
  )
  return hasAuthorReplied ? "awaiting-reply" : "stale"
}
