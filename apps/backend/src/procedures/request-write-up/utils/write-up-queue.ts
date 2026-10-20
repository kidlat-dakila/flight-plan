import { reviewKeyId } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { WriteUpTarget } from "./schemas"

export interface WriteUpQueue {
  readonly add: (key: ReviewKey, target: WriteUpTarget) => void
  readonly take: (key: ReviewKey) => readonly WriteUpTarget[]
}

const isSameTarget = (first: WriteUpTarget, second: WriteUpTarget): boolean => JSON.stringify(first) === JSON.stringify(second)

const withQueuedTarget = (queued: readonly WriteUpTarget[], target: WriteUpTarget): readonly WriteUpTarget[] =>
  queued.some((listed) => isSameTarget(listed, target)) ? queued : [...queued, target]

export class InMemoryWriteUpQueue implements WriteUpQueue {
  private targetsByKey: ReadonlyMap<string, readonly WriteUpTarget[]> = new Map()

  public readonly add = (key: ReviewKey, target: WriteUpTarget): void => {
    const queued = this.targetsByKey.get(reviewKeyId(key)) ?? []
    this.targetsByKey = new Map([...this.targetsByKey, [reviewKeyId(key), withQueuedTarget(queued, target)]])
  }

  public readonly take = (key: ReviewKey): readonly WriteUpTarget[] => {
    const queued = this.targetsByKey.get(reviewKeyId(key)) ?? []
    this.targetsByKey = new Map([...this.targetsByKey].filter(([id]) => id !== reviewKeyId(key)))
    return queued
  }
}
