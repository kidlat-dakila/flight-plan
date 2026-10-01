import { resolveDefault } from "@/procedures/save-setup-step/utils/resolve-default"

describe("resolveDefault", () => {
  it("takes the only picked name as the default", () => {
    expect(resolveDefault(["claude"], null)).toBe("claude")
    expect(resolveDefault(["claude"], "codex")).toBe("claude")
  })

  it("keeps a requested default that is among several picked names", () => {
    expect(resolveDefault(["claude", "codex"], "codex")).toBe("codex")
  })

  it("has no default when several are picked and none of them is requested", () => {
    expect(resolveDefault(["claude", "codex"], null)).toBeNull()
    expect(resolveDefault(["claude", "codex"], "cursor")).toBeNull()
    expect(resolveDefault([], "cursor")).toBeNull()
  })
})
