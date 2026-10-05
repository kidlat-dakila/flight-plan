import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export type ChangeWait = "changed" | "timed-out" | "aborted"

export interface ChangeWaitOptions {
  readonly timeoutMs: number | null
  readonly signal: AbortSignal | null
}

export interface ConversationSubscription {
  readonly nextChange: (options: ChangeWaitOptions) => Promise<ChangeWait>
  readonly close: () => void
}

export interface ChangesOptions {
  readonly signal: AbortSignal | null
  readonly remainingMs: (() => number) | null
}

const NO_TIME_LEFT_MS = 0

const nextChangeOf = async (subscription: ConversationSubscription, options: ChangesOptions): Promise<ChangeWait> => {
  const timeoutMs = options.remainingMs === null ? null : Math.max(options.remainingMs(), NO_TIME_LEFT_MS)
  if (timeoutMs === NO_TIME_LEFT_MS) return "timed-out"
  return await subscription.nextChange({ timeoutMs, signal: options.signal })
}

export const readsOnChange = <Read>(
  subscription: ConversationSubscription,
  options: ChangesOptions,
  read: () => Promise<Read>,
): AsyncIterable<Read> => ({
  [Symbol.asyncIterator]: () => ({
    next: async (): Promise<IteratorResult<Read, undefined>> => {
      const wait = await nextChangeOf(subscription, options)
      return wait === "changed" ? { value: await read(), done: false } : { value: undefined, done: true }
    },
  }),
})

export interface ConversationHub {
  readonly publish: (key: ReviewKey) => void
  readonly subscribe: (key: ReviewKey) => ConversationSubscription
  readonly close: () => Promise<void>
}
