import { appendEvents, EMPTY_CONVERSATION } from "@/procedures/get-conversation/utils/conversation"
import { formatConversation, parseConversation } from "@/procedures/get-conversation/utils/stored-conversation"
import { agentQuestion, reviewerMessage, STARTED_AT } from "./conversation-fixture"

describe("parseConversation", () => {
  it("reads back every kind of event it formatted, with dates as dates", () => {
    const { conversation } = appendEvents({ ...EMPTY_CONVERSATION, sessionId: "session-1" }, [
      reviewerMessage("m1", "Why this change?"),
      { kind: "agent-message", id: "a1", body: "Because.", sentAt: STARTED_AT },
      agentQuestion("q1"),
      { kind: "answers", id: "r1", batchId: "q1", origin: "agent", answers: [{ questionId: "q1-1", pickedLabels: [], text: "Either" }], answeredAt: STARTED_AT },
      { kind: "questions-withdrawn", id: "w1", batchId: "q1", reason: "Gone", withdrawnAt: STARTED_AT },
      { kind: "delivery", id: "d1", throughSequence: 1, channel: "listener", deliveredAt: STARTED_AT },
      { kind: "agent-failure", id: "f1", reason: "No claude", failedAt: STARTED_AT },
    ])

    expect(parseConversation(formatConversation(conversation))).toStrictEqual(conversation)
  })

  it("refuses text that is not a stored conversation", () => {
    expect(parseConversation("{ broken")).toBeNull()
    expect(parseConversation(JSON.stringify({ schema: 2, sessionId: null, journal: [] }))).toBeNull()
  })
})
