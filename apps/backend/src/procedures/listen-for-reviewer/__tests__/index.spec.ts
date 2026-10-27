import { createConversationContext, flushPromises, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { IDLE_LIMIT_MS } from "@/procedures/get-conversation/utils/reviewer-activity"
import { LISTEN_WINDOW_MS, listenForReviewer, type ListenPacket } from "@/procedures/listen-for-reviewer"
import type { TerminalCloser } from "@/procedures/open-agent-terminal/utils/terminal-opener"

const drain = async (iterator: AsyncIterator<ListenPacket>, collected: readonly ListenPacket[]): Promise<readonly ListenPacket[]> => {
  const next = await iterator.next()
  return next.done === true ? collected : await drain(iterator, [...collected, next.value])
}

const collect = async (packets: AsyncIterable<ListenPacket>): Promise<readonly ListenPacket[]> =>
  await drain(packets[Symbol.asyncIterator](), [])

const LISTEN_COMMAND = "curl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\""
const STOP_TEXT = "The reviewer has been away from this review for 10 minutes, so Flight Plan ended this live session.\n\nDo not listen again. Tell the reviewer in this terminal that the session ended because the review was idle, and stop. They can start a new session from the review page."
const AGENT_TAB = { terminalApp: "iterm", tty: "/dev/ttys007" } as const
const LISTEN_START = new Date("2026-10-03T12:00:00.000Z")
const FIVE_MINUTES_MS = 300_000
const SLOW_RELISTEN_MS = 20_000

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

  it("tells the agent to stop once the reviewer has been away for the idle limit, and closes the agent's tab Flight Plan opened", async () => {
    vi.useFakeTimers({ now: LISTEN_START })
    const { context, environment } = createConversationContext()
    const closeTerminal = vi.fn<TerminalCloser>(async () => {
      await Promise.resolve()
    })
    const timedContext = { ...context, now: () => new Date(), closeTerminal }
    environment.agentTerminals.remember(KEY, AGENT_TAB)
    const first = await listenForReviewer(KEY, timedContext, null)
    const firstCollecting = first.kind === "listening" ? collect(first.packets) : Promise.resolve([])
    await vi.advanceTimersByTimeAsync(LISTEN_WINDOW_MS)
    await expect(firstCollecting).resolves.toMatchObject([{ kind: "idle" }])
    await vi.advanceTimersByTimeAsync(SLOW_RELISTEN_MS)
    const second = await listenForReviewer(KEY, timedContext, null)
    const secondCollecting = second.kind === "listening" ? collect(second.packets) : Promise.resolve([])

    await vi.advanceTimersByTimeAsync(IDLE_LIMIT_MS - LISTEN_WINDOW_MS - SLOW_RELISTEN_MS)

    await expect(secondCollecting).resolves.toStrictEqual([{ kind: "stop", text: STOP_TEXT }])
    expect(closeTerminal).toHaveBeenCalledWith(AGENT_TAB)
    expect(environment.agentTerminals.tabOf(KEY)).toBeNull()
    expect(environment.reviewerActivity.activityOf(KEY).idleStoppedAt).toStrictEqual(new Date(LISTEN_START.getTime() + IDLE_LIMIT_MS))
    vi.useRealTimers()
  })

  it("closes nothing on an idle stop when Flight Plan opened no tab for the agent", async () => {
    const { context, environment, clock } = createConversationContext()
    const closeTerminal = vi.fn<TerminalCloser>(async () => {
      await Promise.resolve()
    })
    environment.presence.markSeen(KEY, clock.now())
    environment.reviewerActivity.markActive(KEY, new Date(clock.now().getTime() - IDLE_LIMIT_MS))

    const listening = await listenForReviewer(KEY, { ...context, closeTerminal }, null)

    await expect(listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])).resolves.toStrictEqual([{ kind: "stop", text: STOP_TEXT }])
    expect(closeTerminal).not.toHaveBeenCalled()
  })

  it("keeps waiting while the reviewer is active on the review", async () => {
    vi.useFakeTimers({ now: LISTEN_START })
    const { context, environment } = createConversationContext()
    const timedContext = { ...context, now: () => new Date() }
    environment.reviewerActivity.markActive(KEY, new Date(LISTEN_START.getTime() - FIVE_MINUTES_MS))
    environment.presence.markSeen(KEY, LISTEN_START)
    const listening = await listenForReviewer(KEY, timedContext, null)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])

    await vi.advanceTimersByTimeAsync(FIVE_MINUTES_MS - 1)
    environment.reviewerActivity.markActive(KEY, new Date())
    await vi.advanceTimersByTimeAsync(LISTEN_WINDOW_MS - FIVE_MINUTES_MS + 1)

    await expect(collecting).resolves.toMatchObject([{ kind: "idle" }])
    vi.useRealTimers()
  })

  it("hands over waiting work before it stops an idle review", async () => {
    const { context, environment, clock } = createConversationContext()
    environment.presence.markSeen(KEY, clock.now())
    environment.reviewerActivity.markActive(KEY, new Date(clock.now().getTime() - IDLE_LIMIT_MS))
    await environment.store.append(KEY, [reviewerMessage("m1", "Still there?")])

    const first = await listenForReviewer(KEY, context, null)
    const second = await listenForReviewer(KEY, context, null)

    await expect(first.kind === "listening" ? collect(first.packets) : Promise.resolve([])).resolves.toMatchObject([{ kind: "work" }])
    await expect(second.kind === "listening" ? collect(second.packets) : Promise.resolve([])).resolves.toStrictEqual([{ kind: "stop", text: STOP_TEXT }])
  })

  it("restarts the idle clock when a new agent session starts by listening", async () => {
    const { context, environment, clock } = createConversationContext()
    environment.reviewerActivity.markActive(KEY, new Date(clock.now().getTime() - IDLE_LIMIT_MS))
    const disconnection = new AbortController()
    const listening = await listenForReviewer(KEY, context, disconnection.signal)
    const collecting = listening.kind === "listening" ? collect(listening.packets) : Promise.resolve([])
    await flushPromises()

    disconnection.abort()

    await expect(collecting).resolves.toStrictEqual([])
    expect(environment.reviewerActivity.activityOf(KEY).lastActiveAt).toStrictEqual(clock.now())
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
