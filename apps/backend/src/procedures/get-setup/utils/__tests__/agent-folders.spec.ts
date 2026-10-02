import { agentFolders, isAgentFolder } from "@/procedures/get-setup/utils/agent-folders"

describe("agentFolders", () => {
  it("looks for each agent's folder in the home folder", () => {
    expect(agentFolders("/Users/dev", {})).toStrictEqual([
      { agent: "claude", path: "/Users/dev/.claude" },
      { agent: "codex", path: "/Users/dev/.codex" },
      { agent: "cursor", path: "/Users/dev/.cursor" },
    ])
  })

  it("follows the folders Claude and Codex are told to use", () => {
    const environment = { CLAUDE_CONFIG_DIR: "/work/claude", CODEX_HOME: "/work/codex" }

    expect(agentFolders("/Users/dev", environment)).toStrictEqual([
      { agent: "claude", path: "/work/claude" },
      { agent: "codex", path: "/work/codex" },
      { agent: "cursor", path: "/Users/dev/.cursor" },
    ])
  })

  it("ignores an empty folder variable", () => {
    expect(agentFolders("/Users/dev", { CODEX_HOME: "" })[1]).toStrictEqual({ agent: "codex", path: "/Users/dev/.codex" })
  })
})

describe("isAgentFolder", () => {
  it("recognises each agent's folder by what the agent keeps in it", () => {
    expect(isAgentFolder("claude", ["CLAUDE.md", "settings.json"])).toBe(true)
    expect(isAgentFolder("codex", ["auth.json", "skills"])).toBe(true)
    expect(isAgentFolder("cursor", ["cli-config.json"])).toBe(true)
  })

  it("does not take one agent's folder, or any other folder, for another's", () => {
    expect(isAgentFolder("cursor", ["settings.json", "projects", "plugins"])).toBe(false)
    expect(isAgentFolder("claude", ["auth.json", "config.toml"])).toBe(false)
    expect(isAgentFolder("codex", [])).toBe(false)
  })
})
