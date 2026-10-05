import type { ProcedureContext } from "@/procedures/context"
import { formatInbound, formatListenPacket, listenCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import { lastSequenceOf, pendingInboundOf } from "@/procedures/get-conversation/utils/conversation"
import { appendAndPublish, findReviewTarget } from "@/procedures/get-conversation/utils/conversation-actions"
import { readsOnChange, type ConversationSubscription } from "@/procedures/get-conversation/utils/conversation-hub"
import type { ConversationKey } from "@/procedures/get-conversation/utils/schemas"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export interface ListenPacket {
  readonly throughSequence: number
  readonly text: string
}

export type Listening
  = | { readonly kind: "listening", readonly packets: AsyncIterable<ListenPacket> }
    | { readonly kind: "rejected", readonly message: string }

const readPacket = async (key: ReviewKey, context: ProcedureContext): Promise<ListenPacket | null> => {
  const { store, serverUrl } = context.conversationEnvironment
  const { journal } = await store.read(key)
  const pending = pendingInboundOf(journal)
  if (pending.length === 0) return null
  return {
    throughSequence: lastSequenceOf(pending),
    text: formatListenPacket(formatInbound(pending, journal), listenCommandOf(serverUrl, key)),
  }
}

const recordDelivery = async (key: ReviewKey, packet: ListenPacket, context: ProcedureContext): Promise<void> => {
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
): Promise<ListenPacket | null> => {
  const waiting = await readPacket(key, context)
  if (waiting !== null) return waiting
  const packets = readsOnChange(subscription, { signal, remainingMs: null }, async () => await readPacket(key, context))
  for await (const packet of packets) {
    if (packet !== null) return packet
  }
  return null
}

const packetsOf = async function* (
  key: ReviewKey,
  context: ProcedureContext,
  signal: AbortSignal | null,
): AsyncGenerator<ListenPacket> {
  const { agents, hub } = context.conversationEnvironment
  const subscription = hub.subscribe(key)
  agents.openListener(key)
  hub.publish(key)
  try {
    const packet = await waitForPacket(key, subscription, context, signal)
    if (packet === null) return
    yield packet
    await recordDelivery(key, packet, context)
  } finally {
    subscription.close()
    agents.closeListener(key, context.now())
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
