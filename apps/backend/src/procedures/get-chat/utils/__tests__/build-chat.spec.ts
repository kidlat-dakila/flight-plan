import { AGENT_ANSWER_MS, AGENT_IDLE_MS, AGENT_START_MS, buildChat } from "@/procedures/get-chat/utils/build-chat"
import type { ChatQuestion } from "@/procedures/get-review/utils/discussion"

const SENT_AT = new Date("2026-10-01T12:00:00.000Z")

const after = (ms: number): Date => new Date(SENT_AT.getTime() + ms)

const question = (id: string, sentAt: Date, reference: string | null = null): ChatQuestion => ({
  id,
  body: "Why is it rounded?",
  reference,
  sentAt,
})

describe("buildChat", () => {
  it("has no agent running and invites a question before the first message", () => {
    expect(buildChat([], SENT_AT)).toMatchObject({
      agentState: "not-running",
      agentStateLabel: "Agent not running",
      emptyMessage: "Ask about this review. The agent starts with your first message.",
      messages: [],
    })
  })

  it("starts the agent with the first message and keeps the answer waiting", () => {
    const chat = buildChat([question("q1", SENT_AT)], after(AGENT_START_MS - 1))

    expect(chat).toMatchObject({ agentState: "starting", emptyMessage: null })
    expect(chat.messages).toMatchObject([
      { id: "q1", author: "reviewer", authorLabel: "You", isWaiting: false },
      { id: "q1-answer", author: "agent", isWaiting: true, body: [] },
    ])
  })

  it("is running once started, and answers after it has worked on the question", () => {
    expect(buildChat([question("q1", SENT_AT)], after(AGENT_START_MS))).toMatchObject({
      agentState: "running",
      messages: [{}, { isWaiting: true }],
    })
    expect(buildChat([question("q1", SENT_AT, "storefront@abc:src/a.ts#L3")], after(AGENT_START_MS + AGENT_ANSWER_MS))).toMatchObject({
      agentState: "running",
      messages: [{ reference: "storefront@abc:src/a.ts#L3" }, { author: "agent", isWaiting: false }],
    })
  })

  it("answers a follow-up without starting again while the agent is still running", () => {
    const followUp = question("q2", after(60_000))
    const chat = buildChat([question("q1", SENT_AT), followUp], after(60_000 + AGENT_ANSWER_MS))

    expect(chat.agentState).toBe("running")
    expect(chat.messages.map((message) => message.isWaiting)).toStrictEqual([false, false, false, false])
  })

  it("stops the agent after it has been idle, and starts it again for the next message", () => {
    const answeredAtMs = AGENT_START_MS + AGENT_ANSWER_MS

    expect(buildChat([question("q1", SENT_AT)], after(answeredAtMs + AGENT_IDLE_MS + 1)).agentState).toBe("not-running")

    const later = after(answeredAtMs + AGENT_IDLE_MS + 5000)

    expect(buildChat([question("q1", SENT_AT), question("q2", later)], new Date(later.getTime() + 1)).agentState).toBe("starting")
  })
})
