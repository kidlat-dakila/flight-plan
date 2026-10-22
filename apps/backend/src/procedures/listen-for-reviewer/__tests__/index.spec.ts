import { createConversationContext, flushPromises, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { LISTEN_WINDOW_MS, listenForReviewer, type ListenPacket } from "@/procedures/listen-for-reviewer"

const drain = async (iterator: AsyncIterator<ListenPacket>, collected: readonly ListenPacket[]): Promise<readonly ListenPacket[]> => {
  const next = await iterator.next()
  return next.done === true ? collected : await drain(iterator, [...collected, next.value])
}

const collect = async (packets: AsyncIterable<ListenPacket>): Promise<readonly ListenPacket[]> =>
  await drain(packets[Symbol.asyncIterator](), [])

const LISTEN_COMMAND = "curl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\""
const NEXT_COMMAND = `When you have done everything above, listen again with this command, in the foreground:\n${LISTEN_COMMAND}`

describe("listenForReviewer", () => {
  it("hands over the replies already waiting, then marks them delivered", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "First"), reviewerMessage("m2", "Second")])
    const listening = await listenForReviewer(KEY, context, null)

    const packets = listening.kind === "listening" ? await collect(listening.packets) : []

    expect(packets).toStrictEqual([
      { kind: "work", throughSequence: 2, text: `The reviewer wrote:\nFirst\n\nThe reviewer wrote:\nSecond\n\n${NEXT_COMMAND}` },
    ])
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "delivery", channel: "listener", throughSequence: 2 })
    expect(environment.presence.presenceOf(KEY).openStreamCount).toBe(0)
  })

  it("waits for the next reply and keeps the agent online meanwhile", async () => {
    const { context, environment } = createConversationContext()
    const listening = await listenForReviewer(KEY, context, null)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])
    await flushPromises()

    expect(environment.presence.presenceOf(KEY).openStreamCount).toBe(1)
    await appendAndPublish(KEY, [reviewerMessage("m1", "Now")], context)

    await expect(collecting).resolves.toMatchObject([{ kind: "work", throughSequence: 1 }])
  })

  it("gives the work to only one of two agents listening on the same review", async () => {
    const { context } = createConversationContext()
    const first = await listenForReviewer(KEY, context, null)
    const secondDisconnection = new AbortController()
    const second = await listenForReviewer(KEY, context, secondDisconnection.signal)
    const firstCollecting = first.kind === "listening" ? collect(first.packets) : Promise.resolve([])
    const secondCollecting = second.kind === "listening" ? collect(second.packets) : Promise.resolve([])
    await flushPromises()

    await appendAndPublish(KEY, [reviewerMessage("m1", "Once")], context)
    await flushPromises()
    secondDisconnection.abort()

    const delivered = [...await firstCollecting, ...await secondCollecting].filter((packet) => packet.kind === "work")
    expect(delivered).toHaveLength(1)
  })

  it("tells the agent to listen again when nothing comes within the window", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-03T12:00:00.000Z") })
    const { context } = createConversationContext()
    const timedContext = { ...context, now: () => new Date() }
    const listening = await listenForReviewer(KEY, timedContext, null)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])

    await vi.advanceTimersByTimeAsync(LISTEN_WINDOW_MS)

    await expect(collecting).resolves.toStrictEqual([
      { kind: "idle", text: `Nothing new from the reviewer yet.\n\nListen again with this command, in the foreground:\n${LISTEN_COMMAND}` },
    ])
    vi.useRealTimers()
  })

  it("stops waiting when the connection closes, without delivering anything", async () => {
    const { context, environment } = createConversationContext()
    const disconnection = new AbortController()
    const listening = await listenForReviewer(KEY, context, disconnection.signal)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])
    await flushPromises()

    disconnection.abort()

    await expect(collecting).resolves.toStrictEqual([])
    expect(environment.presence.presenceOf(KEY)).toMatchObject({ openStreamCount: 0, lastSeenAt: context.now() })
  })

  it("rejects a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()

    await expect(listenForReviewer({ repositoryName: "billing", targetId: "pr-1" }, context, null)).resolves.toMatchObject({ kind: "rejected" })
  })
})
