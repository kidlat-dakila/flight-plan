import { buildConversation } from "@/procedures/get-conversation/utils/build-conversation"
import { appendEvents, EMPTY_CONVERSATION, type ConversationEvent } from "@/procedures/get-conversation/utils/conversation"
import { agentQuestion, reviewerMessage, STARTED_AT } from "./conversation-fixture"

const LATER = new Date(STARTED_AT.getTime() + 120_000)

const conversationOf = (events: readonly ConversationEvent[]) => appendEvents(EMPTY_CONVERSATION, events).conversation

const snapshotOf = (events: readonly ConversationEvent[], overrides = {}) => ({
  conversation: conversationOf(events),
  isAgentOnline: false,
  ...overrides,
})

describe("buildConversation", () => {
  it("shows the reviewer's and the agent's messages in order, with prose and times ready to render", () => {
    const view = buildConversation(
      snapshotOf([reviewerMessage("m1", "Why `retry`?"), { kind: "agent-message", id: "a1", body: "It **guards** the call.", sentAt: STARTED_AT }]),
      LATER,
    )

    expect(view.entries).toMatchObject([
      { kind: "message", id: "m1", author: "reviewer", authorLabel: "You", timeLabel: "2 minutes ago" },
      { kind: "message", id: "a1", author: "agent", authorLabel: "Agent" },
    ])
    expect(view.agentState).toBe("offline")
    expect(view.agentStateLabel).toBe("Agent offline")
  })

  it("shows an open batch as waiting for the reviewer, and an answered one with its answer", () => {
    const answered = buildConversation(
      snapshotOf([
        agentQuestion("q1"),
        { kind: "answers", id: "r1", batchId: "q1", origin: "agent", answers: [{ questionId: "q1-1", pickedLabels: ["By layer"], text: "API first" }], answeredAt: STARTED_AT },
        agentQuestion("q2"),
      ]),
      LATER,
    )

    expect(answered.entries).toMatchObject([
      { kind: "questions", id: "q1", status: "answered", statusLabel: "Answered", heading: "The agent asks a question", questions: [{ answerLabel: "By layer; API first" }] },
      { kind: "questions", id: "q2", status: "open", statusLabel: "Waiting for your answer", questions: [{ answerLabel: null }] },
    ])
  })

  it("names a permission request and shows why it was withdrawn", () => {
    const view = buildConversation(
      snapshotOf([
        agentQuestion("p1", "permission"),
        { kind: "questions-withdrawn", id: "w1", batchId: "p1", reason: "The agent stopped waiting for an answer.", withdrawnAt: STARTED_AT },
      ]),
      LATER,
    )

    expect(view.entries).toMatchObject([
      { isPermission: true, heading: "The agent asks for permission", status: "withdrawn", statusLabel: "The agent stopped waiting for an answer." },
    ])
  })

  it("reports the agent as online or offline", () => {
    expect(buildConversation(snapshotOf([], { isAgentOnline: true }), LATER)).toMatchObject({ agentState: "online", agentStateLabel: "Agent online" })
    expect(buildConversation(snapshotOf([], { isAgentOnline: false }), LATER)).toMatchObject({ agentState: "offline", agentStateLabel: "Agent offline" })
  })

  it("invites a first message while the conversation is empty, and words the panel", () => {
    expect(buildConversation(snapshotOf([]), LATER)).toMatchObject({
      heading: "Chat with the agent",
      closeLabel: "Close the chat",
      placeholder: "Ask about this review",
      sendLabel: "Send",
      emptyMessage: "Ask about this review. Your agent answers here once it is online.",
    })
    expect(buildConversation(snapshotOf([reviewerMessage("m1", "Hi")]), LATER).emptyMessage).toBeNull()
  })

  it("words how each question is answered: an own answer beside options, a reason for a permission", () => {
    const view = buildConversation(snapshotOf([agentQuestion("q1"), agentQuestion("p1", "permission")]), LATER)

    expect(view.entries).toMatchObject([
      { id: "q1", submitLabel: "Send your answer", questions: [{ textLabel: "Your own answer" }] },
      { id: "p1", submitLabel: "Send", questions: [{ textLabel: "Why, for the agent (optional)" }] },
    ])
  })

  it("reads a message as markdown and keeps every code link it writes", () => {
    const view = buildConversation(
      snapshotOf([{ kind: "agent-message", id: "a1", body: "See [`priceOf()`](code:src/price.ts#priceOf).", sentAt: STARTED_AT }]),
      LATER,
    )

    expect(view.entries).toMatchObject([
      {
        body: [
          {
            kind: "paragraph",
            inlines: [
              { kind: "text", text: "See " },
              { kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" },
              { kind: "text", text: "." },
            ],
          },
        ],
      },
    ])
  })

  it("leaves a model the reviewer chose out of the entries", () => {
    const view = buildConversation(
      snapshotOf([{ kind: "model-choice", id: "c1", agent: "claude", model: "haiku", effort: "default", chosenAt: STARTED_AT }]),
      LATER,
    )

    expect(view.entries).toStrictEqual([])
  })
})
