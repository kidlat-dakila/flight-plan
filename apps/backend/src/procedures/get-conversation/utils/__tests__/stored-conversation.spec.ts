import { appendEvents, EMPTY_CONVERSATION } from "@/procedures/get-conversation/utils/conversation"
import { formatConversation, parseConversation } from "@/procedures/get-conversation/utils/stored-conversation"
import { agentQuestion, reviewerMessage, STARTED_AT } from "./conversation-fixture"

describe("parseConversation", () => {
  it("reads back every kind of event it formatted, with dates as dates", () => {
    const { conversation } = appendEvents({ ...EMPTY_CONVERSATION, sessionId: "session-1" }, [
      reviewerMessage("m1", "Why this change?"),
      { ...reviewerMessage("m2", "And this?"), reference: "storefront@c81e220:src/x.ts#L3", excerpt: { kind: "code", text: "const x = 1" } },
      { kind: "agent-message", id: "a1", body: "Because.", sentAt: STARTED_AT },
      agentQuestion("q1"),
      { kind: "answers", id: "r1", batchId: "q1", origin: "agent", answers: [{ questionId: "q1-1", pickedLabels: [], text: "Either" }], answeredAt: STARTED_AT },
      { kind: "questions-withdrawn", id: "w1", batchId: "q1", reason: "Gone", withdrawnAt: STARTED_AT },
      { kind: "delivery", id: "d1", throughSequence: 1, channel: "listener", deliveredAt: STARTED_AT },
      { kind: "agent-failure", id: "f1", reason: "No claude", failedAt: STARTED_AT },
      { kind: "model-choice", id: "c1", agent: "claude", model: "haiku", effort: "default", chosenAt: STARTED_AT },
    ])

    expect(parseConversation(formatConversation(conversation))).toStrictEqual(conversation)
  })

  it("reads a reviewer message kept before messages had an excerpt as one without an excerpt", () => {
    const stored = {
      schema: 1,
      sessionId: null,
      journal: [{ sequence: 1, event: { kind: "reviewer-message", id: "m1", body: "Why?", reference: null, sentAt: STARTED_AT.toISOString() } }],
    }

    expect(parseConversation(JSON.stringify(stored))).toStrictEqual({ sessionId: null, journal: [{ sequence: 1, event: { ...reviewerMessage("m1", "Why?"), excerpt: null } }] })
  })

  it("refuses text that is not a stored conversation", () => {
    expect(parseConversation("{ broken")).toBeNull()
    expect(parseConversation(JSON.stringify({ schema: 2, sessionId: null, journal: [] }))).toBeNull()
  })
})
