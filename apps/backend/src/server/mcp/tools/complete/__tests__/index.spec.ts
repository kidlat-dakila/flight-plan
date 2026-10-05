import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("complete tool", () => {
  it("returns what is missing and how to go on while work is left", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("complete", { ...KEY, limit: 1 }))

    expect(response.body).toContain(String.raw`\"finished\":false`)
    expect(response.body).toContain(String.raw`\"total\":15,\"remaining\":14`)
    expect(response.body).toContain("then call complete again")
    expect(response.body).not.toContain("\"isError\":true")
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext(null))

    const response = await server.inject(callTool("complete", KEY))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })
})
