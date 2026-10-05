import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

describe("ask-questions tool", () => {
  it("asks the reviewer through the ask-reviewer procedure, filling defaults for options", async () => {
    const { context, environment } = createConversationContext()
    const server = await buildServer({}, context)

    const response = await server.inject({
      method: "POST",
      url: "/mcp",
      headers: MCP_HEADERS,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "ask-questions", arguments: { ...KEY, questions: [{ prompt: "Anything to skip?" }] } },
      },
    })

    expect(response.body).toContain("The reviewer sees your questions (id-1) in Flight Plan.")
    await expect(environment.store.read(KEY)).resolves.toMatchObject({
      journal: [{ event: { kind: "question-batch", questions: [{ prompt: "Anything to skip?", options: [], allowsMultiple: false }] } }],
    })
    await server.close()
  })
})
