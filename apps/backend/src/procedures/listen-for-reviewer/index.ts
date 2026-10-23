import type { ProcedureContext } from "@/procedures/context"
import { formatIdlePacket, formatInbound, formatListenPacket, formatStopPacket, listenCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import { inboundAfter, lastDeliveredSequenceOf, lastSequenceOf } from "@/procedures/get-conversation/utils/conversation"
import {
  appendAndPublish,
  findReviewTarget,
  isReviewerIdleFor,
  restartIdleClockForNewSession,
} from "@/procedures/get-conversation/utils/conversation-actions"
import { readsOnChange, type ConversationSubscription } from "@/procedures/get-conversation/utils/conversation-hub"
import { idleDeadlineOf } from "@/procedures/get-conversation/utils/reviewer-activity"
import type { ConversationKey } from "@/procedures/get-conversation/utils/schemas"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export const LISTEN_WINDOW_MS = 540_000

const MS_PER_MINUTE = 60_000

export type ListenPacket
  = | { readonly kind: "work", readonly throughSequence: number, readonly text: string }
    | { readonly kind: "idle", readonly text: string }
    | { readonly kind: "stop", readonly text: string }

export type Listening
  = | { readonly kind: "listening", readonly packets: AsyncIterable<ListenPacket> }
    | { readonly kind: "rejected", readonly message: string }

type WorkPacket = Extract<ListenPacket, { kind: "work" }>

const claimPacket = async (key: ReviewKey, context: ProcedureContext): Promise<WorkPacket | null> => {
  const { store, presence, serverUrl } = context.conversationEnvironment
  const { journal } = await store.read(key)
  const claimed = Math.max(lastDeliveredSequenceOf(journal), presence.presenceOf(key).claimedThroughSequence)
  const pending = inboundAfter(journal, claimed)
  if (pending.length === 0) return null
  const throughSequence = lastSequenceOf(pending)
  if (!presence.claimThrough(key, throughSequence)) return null
  return {
    kind: "work",
    throughSequence,
    text: formatListenPacket(formatInbound(pending, journal), listenCommandOf(serverUrl, key)),
  }
}

const recordDelivery = async (key: ReviewKey, packet: WorkPacket, context: ProcedureContext): Promise<void> => {
  await appendAndPublish(
    key,
    [
      {
        kind: "delivery",
        id: context.conversationEnvironment.newId(),
        throughSequence: packet.throughSequence,
        channel: "listener",
        deliveredAt: context.now(),
      },
    ],
    context,
  )
}

const waitDeadlineOf = (key: ReviewKey, context: ProcedureContext, listenDeadlineMs: number): number => {
  const { reviewerActivity, idleLimitMs } = context.conversationEnvironment
  const idleDeadlineMs = idleDeadlineOf(reviewerActivity.activityOf(key), idleLimitMs)
  return idleDeadlineMs === null ? listenDeadlineMs : Math.min(listenDeadlineMs, idleDeadlineMs)
}

const waitForPacket = async (
  key: ReviewKey,
  subscription: ConversationSubscription,
  context: ProcedureContext,
  signal: AbortSignal | null,
  listenDeadlineMs: number,
): Promise<WorkPacket | null> => {
  const remainingMs = () => waitDeadlineOf(key, context, listenDeadlineMs) - context.now().getTime()
  const packets = readsOnChange(subscription, { signal, remainingMs }, async () => await claimPacket(key, context))
  for await (const packet of packets) {
    if (packet !== null) return packet
  }
  const isWindowOpen = context.now().getTime() < listenDeadlineMs
  const shouldKeepWaiting = signal?.aborted !== true && isWindowOpen && !isReviewerIdleFor(key, context)
  return shouldKeepWaiting ? await waitForPacket(key, subscription, context, signal, listenDeadlineMs) : null
}

const nextPacketOf = async (
  key: ReviewKey,
  subscription: ConversationSubscription,
  context: ProcedureContext,
  signal: AbortSignal | null,
): Promise<WorkPacket | null> => {
  const waiting = await claimPacket(key, context)
  if (waiting !== null) return waiting
  return await waitForPacket(key, subscription, context, signal, context.now().getTime() + LISTEN_WINDOW_MS)
}

const idlePacketOf = (key: ReviewKey, context: ProcedureContext): ListenPacket => ({
  kind: "idle",
  text: formatIdlePacket(listenCommandOf(context.conversationEnvironment.serverUrl, key)),
})

const endPacketOf = (key: ReviewKey, context: ProcedureContext): ListenPacket => {
  const { idleLimitMs } = context.conversationEnvironment
  return idleLimitMs !== null && isReviewerIdleFor(key, context)
    ? { kind: "stop", text: formatStopPacket(idleLimitMs / MS_PER_MINUTE) }
    : idlePacketOf(key, context)
}

const closeAgentTerminal = async (key: ReviewKey, context: ProcedureContext): Promise<void> => {
  const { agentTerminals } = context.conversationEnvironment
  const window = agentTerminals.windowOf(key)
  if (window === null || context.closeTerminal === null) return
  agentTerminals.forget(key)
  await context.closeTerminal(window)
}

const endIdleSession = async (key: ReviewKey, context: ProcedureContext): Promise<void> => {
  context.conversationEnvironment.reviewerActivity.markIdleStopped(key, context.now())
  await closeAgentTerminal(key, context)
}

const packetsOf = async function* (
  key: ReviewKey,
  context: ProcedureContext,
  signal: AbortSignal | null,
): AsyncGenerator<ListenPacket> {
  const { presence, hub } = context.conversationEnvironment
  const subscription = hub.subscribe(key)
  restartIdleClockForNewSession(key, context)
  presence.openStream(key)
  hub.publish(key)
  try {
    const packet = await nextPacketOf(key, subscription, context, signal)
    if (packet !== null) {
      yield packet
      await recordDelivery(key, packet, context)
    } else if (signal?.aborted !== true) {
      const endPacket = endPacketOf(key, context)
      yield endPacket
      if (endPacket.kind === "stop") await endIdleSession(key, context)
    }
  } finally {
    subscription.close()
    presence.closeStream(key, context.now())
    hub.publish(key)
  }
}

export const listenForReviewer = async (
  input: ConversationKey,
  context: ProcedureContext,
  signal: AbortSignal | null,
): Promise<Listening> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  return { kind: "listening", packets: packetsOf(key, context, signal) }
}
