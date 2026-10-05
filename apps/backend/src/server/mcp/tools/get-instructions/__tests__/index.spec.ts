import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("get-instructions tool", () => {
  it("returns the index of the requested configuration as JSON", async () => {
    const server = await buildServer({}, await createArtifactContext(undefined, "minimal"))

    const response = await server.inject(callTool("get-instructions", KEY))

    expect(response.body).toContain(String.raw`\"configuration\":\"minimal\"`)
    expect(response.body).toContain(String.raw`\"path\":\"writingStyle\"`)
    await server.close()
  })

  it("returns the fields asked for", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("get-instructions", { ...KEY, fields: ["codeLinks"] }))

    expect(response.body).toContain("What codeLinks is.")
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("get-instructions", { ...KEY, fields: ["nothing"] }))

    expect(response.body).toContain("\"isError\":true")
    expect(response.body).toContain("No field at")
    await server.close()
  })
})
