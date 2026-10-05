import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("nodes tool", () => {
  it("returns what is left to write with its totals", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("nodes", { ...KEY, unfilled: true, limit: 1 }))

    expect(response.body).toContain(String.raw`\"id\":\"b-subtotal\"`)
    expect(response.body).toContain(String.raw`\"total\":10,\"remaining\":9`)
    await server.close()
  })

  it("returns the items asked for by id", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("nodes", { ...KEY, ids: ["w1"] }))

    expect(response.body).toContain(String.raw`\"kind\":\"waypoint\",\"id\":\"w1\"`)
    expect(response.body).not.toContain("remaining")
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("nodes", KEY))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })
})
