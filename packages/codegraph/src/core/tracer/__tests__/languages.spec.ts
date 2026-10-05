import { describe, expect, it } from "vitest"
import type { SourceReader } from "@/core/tracer/language"
import { allExtensions, languageForPath, type Language } from "@/core/tracer/languages"
import type { PyRepo } from "@/core/tracer/python"

const languageAt = (file: string): Language => {
  const language = languageForPath(file)
  if (language === null) throw new Error(`no language for ${file}`)
  return language
}

const isPythonRepo = (repo: SourceReader): repo is PyRepo => "rootsFor" in repo

const rootsOf = async (repo: SourceReader, file: string): Promise<string[]> => (isPythonRepo(repo) ? repo.rootsFor(file) : [])

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
    const lang = languageAt("pkg/a.py")
    const base = { files: new Set(["pkg/__init__.py", "pkg/a.py"]), read: async (p: string) => await Promise.resolve((p.endsWith(".py") ? "" : null)) }
    const repo = await lang.makeRepo(base)
    expect(await rootsOf(repo, "pkg/a.py")).toContain("")
  })
})
