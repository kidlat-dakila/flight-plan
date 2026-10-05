import mqemitter from "mqemitter"
import type {
  ChangeWait,
  ChangeWaitOptions,
  ConversationHub,
  ConversationSubscription,
} from "@/procedures/get-conversation/utils/conversation-hub"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

type Emitter = mqemitter.MQEmitter

type Listener = (message: mqemitter.Message, done: () => void) => void

const TOPIC_ROOT = "conversation"

export const topicOf = (key: ReviewKey): string =>
  [TOPIC_ROOT, encodeURIComponent(key.repositoryName), encodeURIComponent(key.targetId)].join("/")

class HubSubscription implements ConversationSubscription {
  private readonly emitter: Emitter
  private readonly topic: string
  private hasChange = false
  private isClosed = false
  private finishWait: ((wait: ChangeWait) => void) | null = null

  public constructor(emitter: Emitter, topic: string) {
    this.emitter = emitter
    this.topic = topic
    emitter.on(topic, this.notify)
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
    this.emitter.removeListener(this.topic, this.notify)
    this.finishWait?.("aborted")
  }

  private readonly notify: Listener = (_message, done) => {
    if (this.finishWait === null) this.hasChange = true
    else this.finishWait("changed")
    done()
  }
}

export const createConversationHub = (): ConversationHub => {
  const emitter = mqemitter()
  return {
    publish: (key) => {
      emitter.emit({ topic: topicOf(key) })
    },
    subscribe: (key) => new HubSubscription(emitter, topicOf(key)),
    close: async () => {
      await new Promise<void>((resolve) => {
        emitter.close(resolve)
      })
    },
  }
}
