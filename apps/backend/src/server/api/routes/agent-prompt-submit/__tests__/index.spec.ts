import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

describe("POST /api/agent-hooks/user-prompt-submit", () => {
  it("records that the spawned session started", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    await deliverToAgent(KEY, context)
    const server = await buildServer({}, context)

    const response = await server.inject({
      method: "POST",
      url: "/api/agent-hooks/user-prompt-submit",
      payload: { session_id: "id-1", hook_event_name: "UserPromptSubmit", prompt: "The reviewer wrote:\nHi" },
    })

    expect(response.json()).toStrictEqual({})
    expect(environment.agents.find(KEY)?.phase).toBe("running")
    await server.close()
  })

  it("rejects a hook call without a session id", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject({ method: "POST", url: "/api/agent-hooks/user-prompt-submit", payload: {} })

    expect(response.statusCode).toBe(400)
    await server.close()
  })
})
