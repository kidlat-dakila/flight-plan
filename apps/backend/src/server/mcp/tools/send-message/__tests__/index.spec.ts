import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("send-message tool", () => {
  it("sends the agent's message through the send-agent-message procedure", async () => {
    const { context, environment } = createConversationContext()
    const server = await buildServer({}, context)

    const response = await server.inject(callTool("send-message", { ...KEY, body: "Ready." }))

    expect(response.body).toContain("Sent to the reviewer.")
    await expect(environment.store.read(KEY)).resolves.toMatchObject({ journal: [{ event: { kind: "agent-message", body: "Ready." } }] })
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject(callTool("send-message", { repositoryName: "billing", targetId: "pr-1", body: "Hi" }))

    expect(response.body).toContain("\"isError\":true")
    expect(response.body).toContain("Flight Plan has no repository named")
    await server.close()
  })
})
