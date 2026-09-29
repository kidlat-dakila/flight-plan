import { describe, expect, it } from "vitest"
import { allExtensions, languageForPath } from "../languages"

describe("language registry", () => {
  it("dispatches by extension", () => {
    expect(languageForPath("src/a.ts")?.id).toBe("typescript")
    expect(languageForPath("src/a.tsx")?.id).toBe("typescript")
    expect(languageForPath("app/main.py")?.id).toBe("python")
    expect(languageForPath("readme.md")).toBeNull()
  })

  it("exposes the union of all extensions", () => {
    const exts = allExtensions()
    expect(exts).toContain(".ts")
    expect(exts).toContain(".py")
  })

  it("builds a python repo with roots and packages", async () => {
    const lang = languageForPath("pkg/a.py")!
    const base = { files: new Set(["pkg/__init__.py", "pkg/a.py"]), read: async (p: string) => (p.endsWith(".py") ? "" : null) }
    const repo = (await lang.makeRepo(base)) as { rootsFor: (f: string) => Promise<string[]> }
    expect(await repo.rootsFor("pkg/a.py")).toContain("")
  })
})
