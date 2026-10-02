import { withCursorMcpServer } from "@/procedures/save-setup-step/utils/cursor-config"

const MCP_URL = "http://localhost:3000/mcp"

const parseMerged = (text: string | null): unknown => JSON.parse(text ?? "null")

describe("withCursorMcpServer", () => {
  it("starts a configuration when there is none", () => {
    expect(parseMerged(withCursorMcpServer(null, MCP_URL))).toStrictEqual({ mcpServers: { flightplan: { url: MCP_URL } } })
  })

  it("keeps the servers already there", () => {
    const existing = JSON.stringify({ mcpServers: { docs: { url: "https://docs.example/mcp" } } }, null, 2)

    expect(parseMerged(withCursorMcpServer(existing, MCP_URL))).toStrictEqual({
      mcpServers: { docs: { url: "https://docs.example/mcp" }, flightplan: { url: MCP_URL } },
    })
  })

  it("replaces an earlier Flight Plan server", () => {
    const existing = JSON.stringify({ mcpServers: { flightplan: { url: "http://localhost:9999/mcp" } } })

    expect(parseMerged(withCursorMcpServer(existing, MCP_URL))).toStrictEqual({ mcpServers: { flightplan: { url: MCP_URL } } })
  })

  it("gives the same text when installed twice", () => {
    const once = withCursorMcpServer(null, MCP_URL)

    expect(withCursorMcpServer(once, MCP_URL)).toBe(once)
  })

  it("refuses a configuration that is not a JSON object", () => {
    expect(withCursorMcpServer("{ broken", MCP_URL)).toBeNull()
    expect(withCursorMcpServer("[]", MCP_URL)).toBeNull()
  })
})
