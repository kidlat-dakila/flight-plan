import {
  appendEvents,
  EMPTY_CONVERSATION,
  findAnswerSet,
  hasOutboundAfter,
  isBatchSettled,
  lastDeliveredSequenceOf,
  latestFailureOf,
  latestModelChoiceOf,
  openQuestionBatchesOf,
  pendingInboundOf,
  type ConversationEvent,
} from "@/procedures/get-conversation/utils/conversation"
import { agentQuestion, reviewerMessage, STARTED_AT } from "./conversation-fixture"

const journalOf = (events: readonly ConversationEvent[]) => appendEvents(EMPTY_CONVERSATION, events).conversation.journal

const delivery = (throughSequence: number): ConversationEvent => ({
  kind: "delivery",
  id: `delivery-${String(throughSequence)}`,
  throughSequence,
  channel: "spawn",
  deliveredAt: STARTED_AT,
})

const answers = (batchId: string, origin: "agent" | "permission"): ConversationEvent => ({
  kind: "answers",
  id: `answers-${batchId}`,
  batchId,
  origin,
  answers: [{ questionId: `${batchId}-1`, pickedLabels: ["By layer"], text: null }],
  answeredAt: STARTED_AT,
})

describe("appendEvents", () => {
  it("numbers new entries after the last one", () => {
    const first = appendEvents(EMPTY_CONVERSATION, [reviewerMessage("m1", "Hi")])
    const second = appendEvents(first.conversation, [reviewerMessage("m2", "Again"), reviewerMessage("m3", "More")])

    expect(first.entries.map((entry) => entry.sequence)).toStrictEqual([1])
    expect(second.entries.map((entry) => entry.sequence)).toStrictEqual([2, 3])
    expect(second.conversation.journal).toHaveLength(3)
  })

  it("leaves the conversation it was given untouched", () => {
    appendEvents(EMPTY_CONVERSATION, [reviewerMessage("m1", "Hi")])

    expect(EMPTY_CONVERSATION.journal).toStrictEqual([])
  })
})

describe("pendingInboundOf", () => {
  it("holds the reviewer's messages and answers to the agent that were not delivered yet", () => {
    const journal = journalOf([
      reviewerMessage("m1", "First"),
      delivery(1),
      reviewerMessage("m2", "Second"),
      agentQuestion("q1"),
      answers("q1", "agent"),
    ])

    expect(pendingInboundOf(journal).map((entry) => entry.sequence)).toStrictEqual([3, 5])
    expect(lastDeliveredSequenceOf(journal)).toBe(1)
  })

  it("never holds answers to a permission request, which go back through the hook", () => {
    const journal = journalOf([agentQuestion("p1", "permission"), answers("p1", "permission")])

    expect(pendingInboundOf(journal)).toStrictEqual([])
  })
})

describe("question batches", () => {
  it("lists only the batches nobody answered or withdrew", () => {
    const journal = journalOf([
      agentQuestion("q1"),
      agentQuestion("q2"),
      answers("q1", "agent"),
      agentQuestion("q3"),
      { kind: "questions-withdrawn", id: "w1", batchId: "q3", reason: "Gone", withdrawnAt: STARTED_AT },
    ])

    expect(openQuestionBatchesOf(journal).map((batch) => batch.id)).toStrictEqual(["q2"])
    expect(isBatchSettled(journal, "q3")).toBe(true)
    expect(findAnswerSet(journal, "q1")?.answers[0]?.pickedLabels).toStrictEqual(["By layer"])
  })
})

describe("hasOutboundAfter", () => {
  it("sees the agent's messages and questions after a sequence, not the reviewer's", () => {
    const journal = journalOf([reviewerMessage("m1", "Hi"), delivery(1), agentQuestion("q1")])

    expect(hasOutboundAfter(journal, 2)).toBe(true)
    expect(hasOutboundAfter(journal, 3)).toBe(false)
  })
})

describe("latestFailureOf", () => {
  it("keeps a failure until a later delivery succeeds", () => {
    const failure: ConversationEvent = { kind: "agent-failure", id: "f1", reason: "No claude", failedAt: STARTED_AT }

    expect(latestFailureOf(journalOf([reviewerMessage("m1", "Hi"), failure]))?.reason).toBe("No claude")
    expect(latestFailureOf(journalOf([reviewerMessage("m1", "Hi"), failure, delivery(1)]))).toBeNull()
  })
})

describe("latestModelChoiceOf", () => {
  const choice = (id: string, agent: "claude" | "codex", model: string): ConversationEvent => ({
    kind: "model-choice",
    id,
    agent,
    model,
    effort: "default",
    chosenAt: STARTED_AT,
  })

  it("finds the last model the reviewer chose for an agent", () => {
    const journal = journalOf([choice("c1", "claude", "opus"), choice("c2", "claude", "haiku"), choice("c3", "codex", "gpt")])

    expect(latestModelChoiceOf(journal, "claude")?.model).toBe("haiku")
    expect(latestModelChoiceOf(journalOf([reviewerMessage("m1", "Hi")]), "claude")).toBeNull()
  })

  it("never counts a choice as something to deliver", () => {
    expect(pendingInboundOf(journalOf([choice("c1", "claude", "opus")]))).toStrictEqual([])
  })
})
