import {
  buildMarketplaceManifest,
  buildSpawnHooksManifest,
  buildSpawnPluginManifest,
  spawnPluginPathOf,
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

describe("spawnPluginPathOf", () => {
  it("keeps the spawn plugin beside the marketplace, outside it", () => {
    expect(spawnPluginPathOf("/data")).toBe("/data/agent-plugin/flightplan-spawn")
  })
})

describe("buildSpawnPluginManifest", () => {
  it("names the plugin that only spawned sessions load", () => {
    expect(buildSpawnPluginManifest()).toMatchObject({ name: "flightplan-spawn" })
  })
})

describe("buildSpawnHooksManifest", () => {
  it("sends each hook to the running server over http", () => {
    const { hooks } = buildSpawnHooksManifest("http://localhost:3000")

    expect(hooks).toStrictEqual({
      UserPromptSubmit: [{ hooks: [{ type: "http", url: "http://localhost:3000/api/agent-hooks/user-prompt-submit", timeout: 10 }] }],
      PostToolUse: [
        { matcher: "*", hooks: [{ type: "http", url: "http://localhost:3000/api/agent-hooks/post-tool-use", timeout: 10 }] },
      ],
      PermissionRequest: [
        {
          matcher: "*",
          hooks: [{ type: "http", url: "http://localhost:3000/api/agent-hooks/permission-request", timeout: 600 }],
        },
      ],
      Stop: [{ hooks: [{ type: "http", url: "http://localhost:3000/api/agent-hooks/stop", timeout: 30 }] }],
    })
  })
})
