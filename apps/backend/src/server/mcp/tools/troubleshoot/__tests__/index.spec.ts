import { createMockProcedureContext } from "@/procedures/context"
import { createTestErrorLog, errorEntryOf } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }
const LOG_ID = "20261023-142000-000009"

const callTool = (toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "troubleshoot", arguments: toolArguments } },
})

const serverWith = async () => {
  const { errorLog } = createTestErrorLog([errorEntryOf(LOG_ID, "The token was refused.")])
  return await buildServer({}, { ...createMockProcedureContext(new Date()), errorLog })
}

describe("troubleshoot tool", () => {
  it("returns the logged error through the read-troubleshoot-request procedure", async () => {
    const server = await serverWith()

    const response = await server.inject(callTool({ logId: LOG_ID }))

    expect(response.body).toContain("The token was refused.")
    expect(response.body).toContain("issues/new")
    await server.close()
  })

  it("returns an id with no log as an error result", async () => {
    const server = await serverWith()

    const response = await server.inject(callTool({ logId: "20261023-000000-abcdef" }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })

  it("refuses an id that is not a log id", async () => {
    const server = await serverWith()

    const response = await server.inject(callTool({ logId: "../setup" }))

    expect(response.body).toContain("This is not a Flight Plan log id.")
    await server.close()
  })
})
