import { createConversationContext, flushPromises, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { listenForReviewer, type ListenPacket } from "@/procedures/listen-for-reviewer"

const drain = async (iterator: AsyncIterator<ListenPacket>, collected: readonly ListenPacket[]): Promise<readonly ListenPacket[]> => {
  const next = await iterator.next()
  return next.done === true ? collected : await drain(iterator, [...collected, next.value])
}

const collect = async (packets: AsyncIterable<ListenPacket>): Promise<readonly ListenPacket[]> =>
  await drain(packets[Symbol.asyncIterator](), [])

const NEXT_COMMAND = "When you are ready for the reviewer's next reply, run this in the background:\ncurl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\""

describe("listenForReviewer", () => {
  it("hands over the replies already waiting, then marks them delivered", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "First"), reviewerMessage("m2", "Second")])
    const listening = await listenForReviewer(KEY, context, null)

    const packets = listening.kind === "listening" ? await collect(listening.packets) : []

    expect(packets).toStrictEqual([
      { throughSequence: 2, text: `The reviewer wrote:\nFirst\n\nThe reviewer wrote:\nSecond\n\n${NEXT_COMMAND}` },
    ])
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "delivery", channel: "listener", throughSequence: 2 })
    expect(environment.agents.listenerPresence(KEY).openCount).toBe(0)
  })

  it("waits for the next reply and counts as a listening session meanwhile", async () => {
    const { context, environment } = createConversationContext()
    const listening = await listenForReviewer(KEY, context, null)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])
    await flushPromises()

    expect(environment.agents.listenerPresence(KEY).openCount).toBe(1)
    await appendAndPublish(KEY, [reviewerMessage("m1", "Now")], context)

    await expect(collecting).resolves.toMatchObject([{ throughSequence: 1 }])
  })

  it("stops waiting when the connection closes, without delivering anything", async () => {
    const { context, environment } = createConversationContext()
    const disconnection = new AbortController()
    const listening = await listenForReviewer(KEY, context, disconnection.signal)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])
    await flushPromises()

    disconnection.abort()

    await expect(collecting).resolves.toStrictEqual([])
    expect(environment.agents.listenerPresence(KEY)).toMatchObject({ openCount: 0, lastClosedAt: context.now() })
  })

  it("rejects a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()

    await expect(listenForReviewer({ repositoryName: "billing", targetId: "pr-1" }, context, null)).resolves.toMatchObject({ kind: "rejected" })
  })
})
