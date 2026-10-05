import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("update-document tool", () => {
  it("writes through the update-document procedure", async () => {
    const context = await createArtifactContext()
    const server = await buildServer({}, context)

    const response = await server.inject(callTool("update-document", { ...KEY, context: "A cart could be a cent off." }))

    expect(response.body).toContain("Wrote the document.")
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ context: { context: "A cart could be a cent off." } }] })
    await server.close()
  })

  it("refuses a field the tool does not have", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("update-document", { ...KEY, title: "A better title" }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })

  it("returns a refusal as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("update-document", { ...KEY, order: { files: ["src/gone.ts"] } }))

    expect(response.body).toContain("\"isError\":true")
    expect(response.body).toContain("Nothing was written.")
    await server.close()
  })
})
