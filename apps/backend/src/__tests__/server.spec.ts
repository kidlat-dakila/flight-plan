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

  it("rejects GET on the stateless MCP endpoint", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/mcp" })
    expect(response.statusCode).toBe(405)
    await server.close()
  })
})
