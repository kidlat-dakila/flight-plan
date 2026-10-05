import { createConversationContext } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

describe("POST /api/agent-hooks/post-tool-use", () => {
  it("answers with no decision, whatever the session", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject({
      method: "POST",
      url: "/api/agent-hooks/post-tool-use",
      payload: { session_id: "unknown", tool_name: "Read", tool_input: { file_path: "/x" } },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({})
    await server.close()
  })
})
