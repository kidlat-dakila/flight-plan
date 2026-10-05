import { planTurnEnding } from "@/procedures/end-agent-turn/utils/plan-turn-ending"
import { reviewerMessage, STARTED_AT } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendEvents, EMPTY_CONVERSATION, type ConversationEvent } from "@/procedures/get-conversation/utils/conversation"

const delivered: ConversationEvent = { kind: "delivery", id: "d1", throughSequence: 1, channel: "spawn", deliveredAt: STARTED_AT }
const written: ConversationEvent = { kind: "agent-message", id: "a1", body: "Because.", sentAt: STARTED_AT }

const journalOf = (events: readonly ConversationEvent[]) => appendEvents(EMPTY_CONVERSATION, events).conversation.journal

describe("planTurnEnding", () => {
  it("closes a turn in which the agent wrote to the reviewer", () => {
    expect(planTurnEnding({ journal: journalOf([reviewerMessage("m1", "Why?"), delivered, written]), wasReminded: false, lastAssistantMessage: "Done" })).toStrictEqual({
      kind: "close",
      unsentReply: null,
    })
  })

  it("reminds an agent once when it wrote nothing to the reviewer", () => {
    expect(planTurnEnding({ journal: journalOf([reviewerMessage("m1", "Why?"), delivered]), wasReminded: false, lastAssistantMessage: "Because." })).toStrictEqual({
      kind: "remind",
    })
  })

  it("passes on the agent's last words when it still wrote nothing after the reminder", () => {
    expect(planTurnEnding({ journal: journalOf([reviewerMessage("m1", "Why?"), delivered]), wasReminded: true, lastAssistantMessage: " Because. " })).toStrictEqual({
      kind: "close",
      unsentReply: "Because.",
    })
  })

  it("hands over replies that arrived during the turn before anything else", () => {
    const plan = planTurnEnding({
      journal: journalOf([reviewerMessage("m1", "Why?"), delivered, reviewerMessage("m2", "Also")]),
      wasReminded: false,
      lastAssistantMessage: "Because.",
    })

    expect(plan).toMatchObject({ kind: "deliver", pending: [{ sequence: 3 }], unsentReply: "Because." })
  })
})
