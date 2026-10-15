import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("read tool", () => {
  it("returns the section asked for as JSON", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("read", { ...KEY, section: "overview" }))

    expect(response.body).toContain(String.raw`\"status\":\"drafting\"`)
    expect(response.body).toContain(String.raw`\"unwritten\":{\"total\":11`)
    await server.close()
  })

  it("refuses a section it does not have", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("read", { ...KEY, section: "findings" }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext(null))

    const response = await server.inject(callTool("read", { ...KEY, section: "overview" }))

    expect(response.body).toContain("\"isError\":true")
    expect(response.body).toContain("No review artifact exists")
    await server.close()
  })
})
