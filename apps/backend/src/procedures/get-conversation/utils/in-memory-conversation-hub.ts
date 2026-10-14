import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { reviewKeyId } from "./conversation"
import type { ChangeWait, ChangeWaitOptions, ConversationHub, ConversationSubscription } from "./conversation-hub"

class InMemorySubscription implements ConversationSubscription {
  private readonly events: EventTarget
  private readonly topic: string
  private hasChange = false
  private isClosed = false
  private finishWait: ((wait: ChangeWait) => void) | null = null

  public constructor(events: EventTarget, topic: string) {
    this.events = events
    this.topic = topic
    events.addEventListener(topic, this.notify)
  }

  public readonly nextChange = async ({ timeoutMs, signal }: ChangeWaitOptions): Promise<ChangeWait> => {
    if (this.hasChange) {
      this.hasChange = false
      return "changed"
    }
    if (this.isClosed || signal?.aborted === true) return "aborted"
    return await new Promise((resolve) => {
      const timer = timeoutMs === null
        ? null
        : setTimeout(() => {
            finish("timed-out")
          }, timeoutMs)
      const handleAbort = () => {
        finish("aborted")
      }
      const finish = (wait: ChangeWait) => {
        if (timer !== null) clearTimeout(timer)
        signal?.removeEventListener("abort", handleAbort)
        this.finishWait = null
        resolve(wait)
      }
      signal?.addEventListener("abort", handleAbort, { once: true })
      this.finishWait = finish
    })
  }

  public readonly close = (): void => {
    if (this.isClosed) return
    this.isClosed = true
    this.events.removeEventListener(this.topic, this.notify)
    this.finishWait?.("aborted")
  }

  private readonly notify = (): void => {
    if (this.finishWait === null) this.hasChange = true
    else this.finishWait("changed")
  }
}

export const createInMemoryConversationHub = (): ConversationHub => {
  const events = new EventTarget()
  return {
    publish: (key: ReviewKey) => {
      events.dispatchEvent(new Event(reviewKeyId(key)))
    },
    subscribe: (key: ReviewKey) => new InMemorySubscription(events, reviewKeyId(key)),
    close: async () => {
      await Promise.resolve()
    },
  }
}
