import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "ping", arguments: toolArguments } },
})

describe("ping tool", () => {
  it("records that the agent is online through the record-ping procedure", async () => {
    const { context, environment } = createConversationContext()
    const server = await buildServer({}, context)

    const response = await server.inject(callTool(KEY))

    expect(response.body).toContain("Flight Plan shows the reviewer that you are online.")
    expect(environment.presence.presenceOf(KEY).lastSeenAt).toStrictEqual(context.now())
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject(callTool({ repositoryName: "billing", targetId: "pr-1" }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })
})
