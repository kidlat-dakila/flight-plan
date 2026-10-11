import { createArtifactContext, KEY, SEGMENT_KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const callTool = (name: string, toolArguments: Record<string, unknown>) => ({
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: toolArguments } },
})

describe("update-nodes tool", () => {
  it("writes through the update-nodes procedure", async () => {
    const context = await createArtifactContext()
    const server = await buildServer({}, context)

    const response = await server.inject(callTool("update-nodes", { ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero for an unknown SKU" }] }))

    expect(response.body).toContain("Wrote 1 entry.")
    expect(response.body).toContain(String.raw`\"nodes\":{\"complete\":0,\"incomplete\":9}`)
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      segments: [{ walkthrough: { files: [{ waypoints: [{ id: "w1", title: "Returned zero for an unknown SKU" }] }, {}] } }],
    })
    await server.close()
  })

  it("ignores an id sent with a write, and leaves the segment the id it has", async () => {
    const context = await createArtifactContext()
    const server = await buildServer({}, context)

    const response = await server.inject(callTool("update-nodes", { ...SEGMENT_KEY, id: "renamed", title: "Rounding" }))

    expect(response.body).not.toContain("\"isError\":true")
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ id: "all", title: "Rounding" }] })
    await server.close()
  })

  it("has no field that changes structure", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("update-nodes", { ...SEGMENT_KEY, waypoints: [{ id: "w1", declaration: "other", children: [] }] }))

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })

  it("returns a refusal as an error result", async () => {
    const server = await buildServer({}, await createArtifactContext())

    const response = await server.inject(callTool("update-nodes", { ...SEGMENT_KEY, waypoints: [{ id: "w9", title: "Nothing" }] }))

    expect(response.body).toContain("\"isError\":true")
    expect(response.body).toContain("This segment has no waypoint")
    await server.close()
  })
})
