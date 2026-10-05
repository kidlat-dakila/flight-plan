import type { RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"
import { buildConversation } from "@/procedures/get-conversation/utils/build-conversation"
import { appendEvents, EMPTY_CONVERSATION, type ConversationEvent } from "@/procedures/get-conversation/utils/conversation"
import { agentQuestion, KEY, reviewerMessage, STARTED_AT } from "./conversation-fixture"

const NO_LISTENER = { openCount: 0, lastClosedAt: null }
const LATER = new Date(STARTED_AT.getTime() + 120_000)

const conversationOf = (events: readonly ConversationEvent[]) => appendEvents(EMPTY_CONVERSATION, events).conversation

const runningAgent = (overrides: Partial<RunningAgent>): RunningAgent => ({
  key: KEY,
  agent: "claude",
  sessionId: "s1",
  process: null,
  phase: "running",
  startedAt: STARTED_AT,
  lastActivityAt: STARTED_AT,
  closing: null,
  isAwaitingPermission: false,
  wasReminded: false,
  ...overrides,
})

const snapshotOf = (events: readonly ConversationEvent[], overrides = {}) => ({
  conversation: conversationOf(events),
  runningAgent: null,
  listenerPresence: NO_LISTENER,
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
    expect(view.agentState).toBe("not-running")
    expect(view.agentStateLabel).toBe("Agent not running")
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

    expect(answered.agentState).toBe("waiting-for-reviewer")
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

  it("reports the agent as starting, working, waiting on a permission, or listening", () => {
    expect(buildConversation(snapshotOf([], { runningAgent: runningAgent({ phase: "starting" }) }), LATER).agentState).toBe("starting")
    expect(buildConversation(snapshotOf([], { runningAgent: runningAgent({}) }), LATER).agentState).toBe("working")
    expect(buildConversation(snapshotOf([], { runningAgent: runningAgent({ isAwaitingPermission: true }) }), LATER).agentState).toBe("waiting-for-reviewer")
    expect(buildConversation(snapshotOf([], { listenerPresence: { openCount: 1, lastClosedAt: null } }), LATER).agentState).toBe("listening")
  })

  it("treats an agent that is closing as no longer running", () => {
    expect(buildConversation(snapshotOf([], { runningAgent: runningAgent({ closing: "turn-ended" }) }), LATER).agentState).toBe("not-running")
  })

  it("shows the last failure as the problem until a delivery succeeds", () => {
    const view = buildConversation(
      snapshotOf([reviewerMessage("m1", "Hi"), { kind: "agent-failure", id: "f1", reason: "The claude command was not found on this machine.", failedAt: STARTED_AT }]),
      LATER,
    )

    expect(view).toMatchObject({ agentState: "failed", agentStateLabel: "Agent could not start", problem: "The claude command was not found on this machine." })
  })
})
