import { parse } from "smol-toml"
import { withCodexMcpServer } from "@/procedures/save-setup-step/utils/codex-config"

const MCP_URL = "http://localhost:3000/mcp"

describe("withCodexMcpServer", () => {
  it("starts a configuration when there is none", () => {
    expect(withCodexMcpServer(null, MCP_URL)).toBe("[mcp_servers.flightplan]\nurl = \"http://localhost:3000/mcp\"\n")
  })

  it("keeps the settings, servers and comments already there", () => {
    const existing = "# my model\nmodel = \"gpt-5\"\n\n[mcp_servers.docs]\ncommand = \"docs-mcp\"\n"

    const merged = withCodexMcpServer(existing, MCP_URL)

    expect(merged).toContain("# my model")
    expect(parse(merged ?? "")).toEqual({
      model: "gpt-5",
      mcp_servers: { docs: { command: "docs-mcp" }, flightplan: { url: MCP_URL } },
    })
  })

  it("replaces an earlier Flight Plan server", () => {
    const existing = "[mcp_servers.flightplan]\nurl = \"http://localhost:9999/mcp\"\n\n[profiles.fast]\nmodel = \"mini\"\n"

    expect(parse(withCodexMcpServer(existing, MCP_URL) ?? "")).toEqual({
      mcp_servers: { flightplan: { url: MCP_URL } },
      profiles: { fast: { model: "mini" } },
    })
  })

  it("gives the same text when installed twice", () => {
    const once = withCodexMcpServer("model = \"gpt-5\"\n", MCP_URL)

    expect(withCodexMcpServer(once, MCP_URL)).toBe(once)
  })

  it("refuses a configuration that is not TOML", () => {
    expect(withCodexMcpServer("model = = broken", MCP_URL)).toBeNull()
  })
})
