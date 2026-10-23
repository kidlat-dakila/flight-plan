import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { reviewKeyId } from "./conversation"

export const ONLINE_WINDOW_MS = 15_000

export const NEW_SESSION_GAP_MS = 60_000

export interface AgentPresence {
  readonly openStreamCount: number
  readonly lastSeenAt: Date | null
  readonly claimedThroughSequence: number
}

export interface AgentPresenceRegistry {
  readonly presenceOf: (key: ReviewKey) => AgentPresence
  readonly openStream: (key: ReviewKey) => void
  readonly closeStream: (key: ReviewKey, closedAt: Date) => void
  readonly markSeen: (key: ReviewKey, seenAt: Date) => void
  readonly claimThrough: (key: ReviewKey, sequence: number) => boolean
}

export const NO_PRESENCE: AgentPresence = { openStreamCount: 0, lastSeenAt: null, claimedThroughSequence: 0 }

export const isAgentOnline = (presence: AgentPresence, now: Date): boolean =>
  presence.openStreamCount > 0
  || (presence.lastSeenAt !== null && now.getTime() - presence.lastSeenAt.getTime() <= ONLINE_WINDOW_MS)

export const isNewAgentSession = (presence: AgentPresence, now: Date): boolean =>
  presence.openStreamCount === 0
  && (presence.lastSeenAt === null || now.getTime() - presence.lastSeenAt.getTime() > NEW_SESSION_GAP_MS)

export class InMemoryAgentPresenceRegistry implements AgentPresenceRegistry {
  private presences: ReadonlyMap<string, AgentPresence> = new Map()

  public readonly presenceOf = (key: ReviewKey): AgentPresence => this.presences.get(reviewKeyId(key)) ?? NO_PRESENCE

  public readonly openStream = (key: ReviewKey): void => {
    this.change(key, (presence) => ({ ...presence, openStreamCount: presence.openStreamCount + 1 }))
  }

  public readonly closeStream = (key: ReviewKey, closedAt: Date): void => {
    this.change(key, (presence) => ({ ...presence, openStreamCount: Math.max(presence.openStreamCount - 1, 0), lastSeenAt: closedAt }))
  }

  public readonly markSeen = (key: ReviewKey, seenAt: Date): void => {
    this.change(key, (presence) => ({ ...presence, lastSeenAt: seenAt }))
  }

  public readonly claimThrough = (key: ReviewKey, sequence: number): boolean => {
    if (this.presenceOf(key).claimedThroughSequence >= sequence) return false
    this.change(key, (presence) => ({ ...presence, claimedThroughSequence: sequence }))
    return true
  }

  private readonly change = (key: ReviewKey, update: (presence: AgentPresence) => AgentPresence): void => {
    this.presences = new Map([...this.presences, [reviewKeyId(key), update(this.presenceOf(key))]])
  }
}
