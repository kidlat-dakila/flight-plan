import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { reviewKeyId } from "./conversation"

export const IDLE_LIMIT_MS = 600_000

export interface ReviewerActivity {
  readonly lastActiveAt: Date | null
  readonly idleStoppedAt: Date | null
}

export interface ReviewerActivityRegistry {
  readonly activityOf: (key: ReviewKey) => ReviewerActivity
  readonly markActive: (key: ReviewKey, activeAt: Date) => void
  readonly markIdleStopped: (key: ReviewKey, stoppedAt: Date) => void
}

export const NO_ACTIVITY: ReviewerActivity = { lastActiveAt: null, idleStoppedAt: null }

export const idleDeadlineOf = (activity: ReviewerActivity, idleLimitMs: number | null): number | null =>
  activity.lastActiveAt === null || idleLimitMs === null ? null : activity.lastActiveAt.getTime() + idleLimitMs

export const isReviewerIdle = (activity: ReviewerActivity, idleLimitMs: number | null, now: Date): boolean => {
  const deadline = idleDeadlineOf(activity, idleLimitMs)
  return deadline !== null && now.getTime() >= deadline
}

export class InMemoryReviewerActivityRegistry implements ReviewerActivityRegistry {
  private activities: ReadonlyMap<string, ReviewerActivity> = new Map()

  public readonly activityOf = (key: ReviewKey): ReviewerActivity => this.activities.get(reviewKeyId(key)) ?? NO_ACTIVITY

  public readonly markActive = (key: ReviewKey, activeAt: Date): void => {
    this.change(key, (activity) => ({ ...activity, lastActiveAt: activeAt }))
  }

  public readonly markIdleStopped = (key: ReviewKey, stoppedAt: Date): void => {
    this.change(key, (activity) => ({ ...activity, idleStoppedAt: stoppedAt }))
  }

  private readonly change = (key: ReviewKey, update: (activity: ReviewerActivity) => ReviewerActivity): void => {
    this.activities = new Map([...this.activities, [reviewKeyId(key), update(this.activityOf(key))]])
  }
}
