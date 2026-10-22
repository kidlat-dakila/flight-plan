import type { ProcedureContext } from "@/procedures/context"
import { formatIdlePacket, formatInbound, formatListenPacket, listenCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import { inboundAfter, lastDeliveredSequenceOf, lastSequenceOf } from "@/procedures/get-conversation/utils/conversation"
import { appendAndPublish, findReviewTarget } from "@/procedures/get-conversation/utils/conversation-actions"
import { readsOnChange, type ConversationSubscription } from "@/procedures/get-conversation/utils/conversation-hub"
import type { ConversationKey } from "@/procedures/get-conversation/utils/schemas"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export const LISTEN_WINDOW_MS = 540_000

export type ListenPacket
  = | { readonly kind: "work", readonly throughSequence: number, readonly text: string }
    | { readonly kind: "idle", readonly text: string }

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

const waitForPacket = async (
  key: ReviewKey,
  subscription: ConversationSubscription,
  context: ProcedureContext,
  signal: AbortSignal | null,
): Promise<WorkPacket | null> => {
  const waiting = await claimPacket(key, context)
  if (waiting !== null) return waiting
  const deadlineMs = context.now().getTime() + LISTEN_WINDOW_MS
  const remainingMs = () => deadlineMs - context.now().getTime()
  const packets = readsOnChange(subscription, { signal, remainingMs }, async () => await claimPacket(key, context))
  for await (const packet of packets) {
    if (packet !== null) return packet
  }
  return null
}

const idlePacketOf = (key: ReviewKey, context: ProcedureContext): ListenPacket => ({
  kind: "idle",
  text: formatIdlePacket(listenCommandOf(context.conversationEnvironment.serverUrl, key)),
})

const packetsOf = async function* (
  key: ReviewKey,
  context: ProcedureContext,
  signal: AbortSignal | null,
): AsyncGenerator<ListenPacket> {
  const { presence, hub } = context.conversationEnvironment
  const subscription = hub.subscribe(key)
  presence.openStream(key)
  hub.publish(key)
  try {
    const packet = await waitForPacket(key, subscription, context, signal)
    if (packet !== null) {
      yield packet
      await recordDelivery(key, packet, context)
    } else if (signal?.aborted !== true) {
      yield idlePacketOf(key, context)
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
