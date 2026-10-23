import { createMockProcedureContext } from "@/procedures/context"
import { createTestErrorLog } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import { buildServer } from "@/server"

const MCP_ACCEPT_HEADER = "application/json, text/event-stream"

const MISSING_REVIEW_INPUT = { repositoryName: "nowhere", targetId: "pr-1", filterKeys: [], isShowingReviewed: false }

const createLoggedContext = () => {
  const testLog = createTestErrorLog()
  return { ...testLog, context: { ...createMockProcedureContext(new Date()), errorLog: testLog.errorLog } }
}

describe("buildServer", () => {
  it("answers the tRPC health query", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/api/trpc/health" })
    expect(response.json()).toStrictEqual({ result: { data: { status: "ok" } } })
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
    expect(initialize.body).toContain("A review artifact is filled in through get-instructions, read, nodes, update-nodes and complete.")
    expect(tools.body).toContain("\"get-instructions\"")
    expect(tools.body).toContain("\"read\"")
    expect(tools.body).toContain("\"nodes\"")
    expect(tools.body).not.toContain("\"update-document\"")
    expect(tools.body).not.toContain("\"greet\"")
    expect(tools.body).toContain("\"update-nodes\"")
    expect(tools.body).toContain("\"complete\"")
    expect(tools.body).toContain("\"ping\"")
    expect(tools.body).toContain("\"troubleshoot\"")
    await server.close()
  })

  it("rejects GET on the stateless MCP endpoint", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/mcp" })
    expect(response.statusCode).toBe(405)
    await server.close()
  })

  it("logs a failed tRPC call and gives the page its log id", async () => {
    const { context, storage } = createLoggedContext()
    const server = await buildServer({}, context)

    const response = await server.inject({ method: "GET", url: `/api/trpc/review.get?input=${encodeURIComponent(JSON.stringify(MISSING_REVIEW_INPUT))}` })
    const [logId] = await storage.listIds()

    expect(response.json()).toMatchObject({ error: { data: { code: "NOT_FOUND", logId } } })
    await expect(storage.read(logId)).resolves.toMatchObject({ source: "tRPC review.get", message: "This review target is not listed in Flight Plan." })
    await server.close()
  })

  it("logs a request that fails outside tRPC", async () => {
    const { context, storage } = createLoggedContext()
    const server = await buildServer({}, context)
    server.get("/api/broken", async () => await Promise.reject(new Error("The route broke.")))

    const response = await server.inject({ method: "GET", url: "/api/broken" })
    const [logId] = await storage.listIds()

    expect(response.statusCode).toBe(500)
    await expect(storage.read(logId)).resolves.toMatchObject({ source: "Request GET /api/broken", message: "The route broke." })
    await server.close()
  })

  it("logs an MCP tool call that fails", async () => {
    const { context, storage } = createLoggedContext()
    const server = await buildServer({}, context)

    await server.inject({
      method: "POST",
      url: "/mcp",
      headers: { "accept": MCP_ACCEPT_HEADER, "content-type": "application/json" },
      payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "ping", arguments: { repositoryName: "nowhere", targetId: "pr-1" } } },
    })
    const [logId] = await storage.listIds()

    await expect(storage.read(logId)).resolves.toMatchObject({ source: "MCP tool ping" })
    await server.close()
  })
})
