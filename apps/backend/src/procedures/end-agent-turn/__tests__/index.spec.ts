import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { endAgentTurn } from "@/procedures/end-agent-turn"
import {
  agentQuestion,
  createConversationContext,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"

const startAgent = async () => {
  const setup = createConversationContext()
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Why?")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

describe("endAgentTurn", () => {
  it("ignores a session Flight Plan did not start", async () => {
    const { context } = createConversationContext()

    await expect(endAgentTurn({ sessionId: "other", lastAssistantMessage: null }, context)).resolves.toStrictEqual({ kind: "unknown-session" })
  })

  it("closes the agent when no reply waits, and marks it closing at once", async () => {
    const { context, environment } = await startAgent()
    await environment.store.append(KEY, [{ kind: "agent-message", id: "a1", body: "Because.", sentAt: context.now() }])

    await expect(endAgentTurn({ sessionId: "id-1", lastAssistantMessage: "Because." }, context)).resolves.toStrictEqual({ kind: "close", key: KEY })
    expect(environment.agents.find(KEY)?.closing).toBe("turn-ended")
    const { journal } = await environment.store.read(KEY)
    expect(journal.filter(({ event }) => event.kind === "agent-message")).toHaveLength(1)
  })

  it("hands the agent the replies that arrived during its turn instead of letting it stop", async () => {
    const { context, environment } = await startAgent()
    await environment.store.append(KEY, [agentQuestion("q1")])
    await environment.store.append(KEY, [reviewerMessage("m2", "Also this.")])

    const ending = await endAgentTurn({ sessionId: "id-1", lastAssistantMessage: null }, context)

    expect(ending).toStrictEqual({ kind: "continue", reason: "The reviewer wrote:\nAlso this." })
    expect(environment.agents.find(KEY)?.closing).toBeNull()
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "delivery", channel: "turn-end", throughSequence: 4 })
  })

  it("reminds the agent once to write through Flight Plan, then passes on its last words", async () => {
    const { context, environment } = await startAgent()

    const reminder = await endAgentTurn({ sessionId: "id-1", lastAssistantMessage: "The retry guards the call." }, context)

    expect(reminder.kind === "continue" ? reminder.reason : "").toContain("Send your reply with send-message")
    expect(environment.agents.find(KEY)?.closing).toBeNull()
    await endAgentTurn({ sessionId: "id-1", lastAssistantMessage: "  The retry guards the flaky call.  " }, context)

    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "agent-message", body: "The retry guards the flaky call." })
  })

  it("saves the session id when the turn ends before any other hook reported the start", async () => {
    const { context, environment } = await startAgent()

    await endAgentTurn({ sessionId: "id-1", lastAssistantMessage: null }, context)

    await expect(environment.store.read(KEY)).resolves.toMatchObject({ sessionId: "id-1" })
  })
})
