import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { buildServer } from "@/server"
import { AGENT_CLOSE_DELAY_MS } from "@/server/api/routes/agent-stop"

const startAgent = async () => {
  const setup = createConversationContext()
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Why?")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

describe("POST /api/agent-hooks/stop", () => {
  it("blocks the stop and hands over a reply that arrived during the turn", async () => {
    const { context } = await startAgent()
    await appendAndPublish(KEY, [reviewerMessage("m2", "One more")], context)
    const server = await buildServer({}, context)

    const response = await server.inject({ method: "POST", url: "/api/agent-hooks/stop", payload: { session_id: "id-1", last_assistant_message: "Done" } })

    expect(response.json()).toStrictEqual({ decision: "block", reason: "The reviewer wrote:\nOne more" })
    await server.close()
  })

  it("lets the agent stop, then closes its process after a short delay", async () => {
    const { context, spawner } = await startAgent()
    await appendAndPublish(KEY, [{ kind: "agent-message", id: "a1", body: "Because.", sentAt: context.now() }], context)
    const server = await buildServer({}, context)
    vi.useFakeTimers({ toFake: ["setTimeout"] })

    const response = await server.inject({ method: "POST", url: "/api/agent-hooks/stop", payload: { session_id: "id-1" } })

    expect(response.json()).toStrictEqual({})
    expect(spawner.processes[0]?.stopCount).toBe(0)
    vi.advanceTimersByTime(AGENT_CLOSE_DELAY_MS)
    expect(spawner.processes[0]?.stopCount).toBe(1)
    vi.useRealTimers()
    await server.close()
  })
})
