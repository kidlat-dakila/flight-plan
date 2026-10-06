import {
  claudeCommandEnvironment,
  dataPathOf,
  executableCandidates,
  installsToReset,
  withoutCodexMcpServer,
  withoutCursorMcpServer,
} from "@/utils/reset-plan"

const HOME_PATH = "/home/reader"

const settingsWith = (installs: readonly { readonly agent: string, readonly installPath: string }[]): string =>
  JSON.stringify({ setup: { agents: { installs } } })

describe("dataPathOf", () => {
  it("defaults to the .flightplan folder in the home folder", () => {
    expect(dataPathOf(HOME_PATH, {})).toBe("/home/reader/.flightplan")
  })

  it("follows FLIGHT_PLAN_DATA_DIR when it is set", () => {
    expect(dataPathOf(HOME_PATH, { FLIGHT_PLAN_DATA_DIR: "/data" })).toBe("/data")
  })
})

describe("installsToReset", () => {
  it("covers every agent's own folder when no settings were saved", () => {
    expect(installsToReset(null, HOME_PATH, {})).toStrictEqual([
      { agent: "claude", installPath: "/home/reader/.claude" },
      { agent: "codex", installPath: "/home/reader/.codex" },
      { agent: "cursor", installPath: "/home/reader/.cursor" },
    ])
  })

  it("follows the folders the agents were configured with", () => {
    const installs = installsToReset(null, HOME_PATH, { CLAUDE_CONFIG_DIR: "/claude", CODEX_HOME: "/codex" })

    expect(installs.map((install) => install.installPath)).toStrictEqual(["/claude", "/codex", "/home/reader/.cursor"])
  })

  it("adds the saved installs that live in another folder", () => {
    const settings = settingsWith([{ agent: "claude", installPath: "/work/claude" }])

    expect(installsToReset(settings, HOME_PATH, {})).toContainEqual({ agent: "claude", installPath: "/work/claude" })
  })

  it("lists a saved install in the agent's own folder once", () => {
    const settings = settingsWith([{ agent: "claude", installPath: "/home/reader/.claude" }])

    expect(installsToReset(settings, HOME_PATH, {})).toHaveLength(3)
  })

  it("ignores settings it cannot read", () => {
    expect(installsToReset("{ not json", HOME_PATH, {})).toHaveLength(3)
  })
})

describe("withoutCursorMcpServer", () => {
  it("removes the Flight Plan server and keeps everything else", () => {
    const config = JSON.stringify({
      theme: "dark",
      mcpServers: { flightplan: { url: "http://localhost:3000/mcp" }, other: { url: "https://example.com" } },
    })

    expect(withoutCursorMcpServer(config)).toBe(
      `${JSON.stringify({ theme: "dark", mcpServers: { other: { url: "https://example.com" } } }, null, 2)}\n`,
    )
  })

  it("returns null when the Flight Plan server is not there", () => {
    expect(withoutCursorMcpServer(JSON.stringify({ mcpServers: { other: {} } }))).toBeNull()
  })

  it("returns null when the config is not valid JSON", () => {
    expect(withoutCursorMcpServer("{ not json")).toBeNull()
  })
})

describe("withoutCodexMcpServer", () => {
  it("removes the Flight Plan table and keeps the tables around it", () => {
    const config = [
      "model = \"gpt\"",
      "",
      "[mcp_servers.flightplan]",
      "url = \"http://localhost:3000/mcp\"",
      "",
      "[mcp_servers.other]",
      "url = \"https://example.com\"",
      "",
    ].join("\n")

    expect(withoutCodexMcpServer(config)).toBe(
      ["model = \"gpt\"", "", "[mcp_servers.other]", "url = \"https://example.com\"", ""].join("\n"),
    )
  })

  it("leaves an empty config when the Flight Plan table was all it held", () => {
    expect(withoutCodexMcpServer("[mcp_servers.flightplan]\nurl = \"http://localhost:3000/mcp\"\n")).toBe("")
  })

  it("returns null when the Flight Plan table is not there", () => {
    expect(withoutCodexMcpServer("model = \"gpt\"\n")).toBeNull()
  })
})

describe("claudeCommandEnvironment", () => {
  it("keeps the environment for Claude's own folder", () => {
    const environment = { PATH: "/bin" }

    expect(claudeCommandEnvironment("/home/reader/.claude", HOME_PATH, environment)).toBe(environment)
  })

  it("points Claude at an install in another folder", () => {
    expect(claudeCommandEnvironment("/work/claude", HOME_PATH, { PATH: "/bin" })).toStrictEqual({
      PATH: "/bin",
      CLAUDE_CONFIG_DIR: "/work/claude",
    })
  })
})

describe("executableCandidates", () => {
  it("searches the PATH folders and then the user programs folder", () => {
    expect(executableCandidates("claude", HOME_PATH, { PATH: "/bin:/usr/bin" })).toStrictEqual([
      "/bin/claude",
      "/usr/bin/claude",
      "/home/reader/.local/bin/claude",
    ])
  })
})
