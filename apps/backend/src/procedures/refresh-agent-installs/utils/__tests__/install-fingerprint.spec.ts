import type { AgentInstall } from "@/procedures/get-setup/utils/setup"
import { installFingerprintOf, isInstallCurrent } from "@/procedures/refresh-agent-installs/utils/install-fingerprint"

const FILES = [
  { path: "skills/review/SKILL.md", content: "# Review" },
  { path: "skills/live/SKILL.md", content: "# Live" },
]
const MCP_URL = "http://localhost:24747/mcp"
const CLAUDE: AgentInstall = { agent: "claude", installPath: "/Users/dev/.claude", model: "default", effort: "default" }

describe("installFingerprintOf", () => {
  it("is the same for the same files in any order", () => {
    expect(installFingerprintOf(FILES, MCP_URL)).toBe(installFingerprintOf([...FILES].reverse(), MCP_URL))
  })

  it("changes when a skill changes, a skill is added, or the server moves", () => {
    const fingerprint = installFingerprintOf(FILES, MCP_URL)

    expect(installFingerprintOf([FILES[0], { ...FILES[1], content: "# Live, again" }], MCP_URL)).not.toBe(fingerprint)
    expect(installFingerprintOf([...FILES, { path: "skills/other/SKILL.md", content: "" }], MCP_URL)).not.toBe(fingerprint)
    expect(installFingerprintOf(FILES, "http://localhost:3000/mcp")).not.toBe(fingerprint)
  })
})

describe("isInstallCurrent", () => {
  it("holds only for a stamp of the same folder and the same fingerprint", () => {
    const stamp = { installPath: CLAUDE.installPath, fingerprint: "abc" }

    expect(isInstallCurrent(CLAUDE, stamp, "abc")).toBe(true)
    expect(isInstallCurrent(CLAUDE, stamp, "def")).toBe(false)
    expect(isInstallCurrent({ ...CLAUDE, installPath: "/Users/dev/.claude-work" }, stamp, "abc")).toBe(false)
    expect(isInstallCurrent(CLAUDE, null, "abc")).toBe(false)
  })
})
