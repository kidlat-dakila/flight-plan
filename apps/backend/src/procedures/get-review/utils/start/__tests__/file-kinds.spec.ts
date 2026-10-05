import { changedFilesLabelOf, summarizeFileKinds } from "@/procedures/get-review/utils/start/file-kinds"

describe("summarizeFileKinds", () => {
  it("counts the changed files of each kind, the most frequent first", () => {
    expect(summarizeFileKinds(["src/a.ts", "src/b.tsx", "src/c.ts", "config/app.json", "src/d.ts", "src/e.tsx"])).toStrictEqual([
      "3 TypeScript",
      "2 TSX",
      "1 JSON",
    ])
  })

  it("orders kinds with the same count by name", () => {
    expect(summarizeFileKinds(["a.py", "b.go"])).toStrictEqual(["1 Go", "1 Python"])
  })

  it("reads the extension whatever its case, and from the file name only", () => {
    expect(summarizeFileKinds(["docs/v1.2/README.MD", "src/app.d.ts"])).toStrictEqual(["1 Markdown", "1 TypeScript"])
  })

  it("counts files with no extension, a leading dot or an unknown extension as other, last", () => {
    expect(summarizeFileKinds(["Makefile", ".gitignore", "logo.xyz", "main.rs"])).toStrictEqual(["1 Rust", "3 other"])
  })

  it("names the six most frequent kinds and counts the rest as other", () => {
    const paths = ["a.ts", "a2.ts", "b.tsx", "c.py", "d.go", "e.rs", "f.rb", "g.java", "h.kt", "Makefile"]

    expect(summarizeFileKinds(paths)).toStrictEqual(["2 TypeScript", "1 Go", "1 Java", "1 Kotlin", "1 Python", "1 Ruby", "3 other"])
  })

  it("has nothing to count for a change without files", () => {
    expect(summarizeFileKinds([])).toStrictEqual([])
  })
})

describe("changedFilesLabelOf", () => {
  it("states how many files changed", () => {
    expect(changedFilesLabelOf(["a.ts"])).toBe("1 changed file")
    expect(changedFilesLabelOf(["a.ts", "b.ts"])).toBe("2 changed files")
  })
})
