import { firstInstallRejection } from "@/procedures/save-setup-step/utils/install-rejection"

describe("firstInstallRejection", () => {
  it("finds nothing to reject when every agent was installed", () => {
    const attempts = [{ install: { agent: "claude", installPath: "/Users/dev/.claude", model: "default" }, installation: { kind: "installed" } }] as const

    expect(firstInstallRejection(attempts)).toBeNull()
  })

  it("puts the first failure under that agent's install path", () => {
    const attempts = [
      { install: { agent: "claude", installPath: "/Users/dev/.claude", model: "default" }, installation: { kind: "installed" } },
      { install: { agent: "codex", installPath: "/Users/dev/.codex", model: "default" }, installation: { kind: "failed", reason: "config.toml is not valid TOML." } },
    ] as const

    expect(firstInstallRejection(attempts)).toStrictEqual({
      kind: "rejected",
      message: "Flight Plan could not be installed for Codex. config.toml is not valid TOML.",
      field: { owner: "codex", name: "installPath" },
    })
  })
})
