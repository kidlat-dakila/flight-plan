import {
  buildMarketplaceManifest,
  buildMcpManifest,
  claudeCommandEnvironment,
  claudeInstallCommands,
} from "@/procedures/save-setup-step/utils/claude-plugin"

describe("buildMarketplaceManifest", () => {
  it("lists the Flight Plan plugin from the folder beside it", () => {
    expect(buildMarketplaceManifest()).toMatchObject({
      name: "flightplan",
      plugins: [{ name: "flightplan", source: "./flightplan" }],
    })
  })
})

describe("buildMcpManifest", () => {
  it("points the plugin at the running server", () => {
    expect(buildMcpManifest("http://localhost:3000/mcp")).toStrictEqual({
      mcpServers: { flightplan: { type: "http", url: "http://localhost:3000/mcp" } },
    })
  })
})

describe("claudeInstallCommands", () => {
  it("adds the marketplace before installing the plugin from it", () => {
    expect(claudeInstallCommands("/data/agent-plugin")).toStrictEqual([
      ["plugin", "marketplace", "add", "/data/agent-plugin"],
      ["plugin", "install", "flightplan@flightplan"],
    ])
  })
})

describe("claudeCommandEnvironment", () => {
  it("leaves the environment alone for the folder Claude already uses", () => {
    const environment = { PATH: "/usr/bin" }

    expect(claudeCommandEnvironment("/Users/dev/.claude", "/Users/dev", environment)).toStrictEqual(environment)
  })

  it("points Claude at another install folder", () => {
    expect(claudeCommandEnvironment("/work/claude", "/Users/dev", { PATH: "/usr/bin" })).toStrictEqual({
      PATH: "/usr/bin",
      CLAUDE_CONFIG_DIR: "/work/claude",
    })
  })
})
