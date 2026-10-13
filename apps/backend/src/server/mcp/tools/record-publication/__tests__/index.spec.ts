import { createMockProcedureContext } from "@/procedures/context"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }
const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const callTool = (toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "record-publication", arguments: toolArguments } },
})

describe("record-publication tool", () => {
  it("records the address and says the reviewer sees the link", async () => {
    const context = createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))
    const server = await buildServer({}, context)

    const response = await server.inject(callTool({ ...KEY, url: "https://claude.ai/artifact/abc123" }))

    expect(response.body).toContain("Recorded.")
    expect(response.body).not.toContain("\"isError\":true")
    await expect(context.reviewStore.readPublications(KEY)).resolves.toMatchObject([{ kind: "claude", url: "https://claude.ai/artifact/abc123" }])
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

    const response = await server.inject(callTool({ ...KEY, url: "https://example.com/page" }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })
})
