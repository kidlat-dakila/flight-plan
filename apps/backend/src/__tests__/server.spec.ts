import { buildServer } from "@/server"

const MCP_ACCEPT_HEADER = "application/json, text/event-stream"

describe("buildServer", () => {
  it("answers the tRPC health query", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/api/trpc/health" })
    expect(response.json()).toStrictEqual({ result: { data: { status: "ok" } } })
    await server.close()
  })

  it("lists the greet tool over MCP", async () => {
    const server = await buildServer()
    const response = await server.inject({
      method: "POST",
      url: "/mcp",
      headers: { "accept": MCP_ACCEPT_HEADER, "content-type": "application/json" },
      payload: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("\"greet\"")
    await server.close()
  })

  it("lists the tools agents use to reach the reviewer, with instructions for the agent", async () => {
    const server = await buildServer()
    const initialize = await server.inject({
      method: "POST",
      url: "/mcp",
      headers: { "accept": MCP_ACCEPT_HEADER, "content-type": "application/json" },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
      },
    })
    const tools = await server.inject({
      method: "POST",
      url: "/mcp",
      headers: { "accept": MCP_ACCEPT_HEADER, "content-type": "application/json" },
      payload: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    })
    expect(initialize.body).toContain("Flight Plan connects you with the reviewer")
    expect(tools.body).toContain("\"send-message\"")
    expect(tools.body).toContain("\"ask-questions\"")
    expect(initialize.body).toContain("A review artifact is filled in through get-instructions, read, nodes, update-document, update-nodes and complete.")
    expect(tools.body).toContain("\"get-instructions\"")
    expect(tools.body).toContain("\"read\"")
    expect(tools.body).toContain("\"nodes\"")
    expect(tools.body).toContain("\"update-document\"")
    expect(tools.body).toContain("\"update-nodes\"")
    expect(tools.body).toContain("\"complete\"")
    await server.close()
  })

  it("rejects GET on the stateless MCP endpoint", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/mcp" })
    expect(response.statusCode).toBe(405)
    await server.close()
  })
})
