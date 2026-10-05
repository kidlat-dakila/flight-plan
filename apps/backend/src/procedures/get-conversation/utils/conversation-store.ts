import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import {
  appendEvents,
  EMPTY_CONVERSATION,
  reviewKeyId,
  type Conversation,
  type ConversationEvent,
  type JournalEntry,
} from "./conversation"

export interface ConversationStore {
  readonly read: (key: ReviewKey) => Promise<Conversation>
  readonly append: (key: ReviewKey, events: readonly ConversationEvent[]) => Promise<readonly JournalEntry[]>
  readonly saveSessionId: (key: ReviewKey, sessionId: string) => Promise<void>
  readonly findKeyBySessionId: (sessionId: string) => Promise<ReviewKey | null>
}

interface HeldConversation {
  readonly key: ReviewKey
  readonly conversation: Conversation
}

export class InMemoryConversationStore implements ConversationStore {
  private held: ReadonlyMap<string, HeldConversation> = new Map()

  public readonly read = async (key: ReviewKey): Promise<Conversation> =>
    await Promise.resolve(this.held.get(reviewKeyId(key))?.conversation ?? EMPTY_CONVERSATION)

  public readonly append = async (key: ReviewKey, events: readonly ConversationEvent[]): Promise<readonly JournalEntry[]> => {
    const appending = appendEvents(this.held.get(reviewKeyId(key))?.conversation ?? EMPTY_CONVERSATION, events)
    this.held = new Map([...this.held, [reviewKeyId(key), { key, conversation: appending.conversation }]])
    return await Promise.resolve(appending.entries)
  }

  public readonly saveSessionId = async (key: ReviewKey, sessionId: string): Promise<void> => {
    const conversation = this.held.get(reviewKeyId(key))?.conversation ?? EMPTY_CONVERSATION
    this.held = new Map([...this.held, [reviewKeyId(key), { key, conversation: { ...conversation, sessionId } }]])
    await Promise.resolve()
  }

  public readonly findKeyBySessionId = async (sessionId: string): Promise<ReviewKey | null> =>
    await Promise.resolve(
      [...this.held.values()].find((held) => held.conversation.sessionId === sessionId)?.key ?? null,
    )
}
