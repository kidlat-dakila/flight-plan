import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { recordAgentActivity } from "@/procedures/record-agent-activity"

const startAgent = async () => {
  const setup = createConversationContext()
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

describe("recordAgentActivity", () => {
  it("takes the first sign of life as the start, and saves the session id so the next start resumes it", async () => {
    const { context, environment } = await startAgent()

    await expect(recordAgentActivity({ sessionId: "id-1" }, context)).resolves.toStrictEqual({ kind: "recorded" })

    expect(environment.agents.find(KEY)?.phase).toBe("running")
    await expect(environment.store.read(KEY)).resolves.toMatchObject({ sessionId: "id-1" })
  })

  it("counts later calls as activity", async () => {
    const { context, environment, clock } = await startAgent()
    await recordAgentActivity({ sessionId: "id-1" }, context)
    clock.advance(30_000)

    await recordAgentActivity({ sessionId: "id-1" }, context)

    expect(environment.agents.find(KEY)?.lastActivityAt).toStrictEqual(clock.now())
  })

  it("ignores a session Flight Plan did not start", async () => {
    const { context } = createConversationContext()

    await expect(recordAgentActivity({ sessionId: "other" }, context)).resolves.toStrictEqual({ kind: "unknown-session" })
  })
})
