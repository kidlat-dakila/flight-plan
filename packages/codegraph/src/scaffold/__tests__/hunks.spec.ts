import { hunkOfPatch, parseHunks } from "@/scaffold/hunks"

const DIFF = [
  "diff --git a/src/price.ts b/src/price.ts",
  "index 1111111..2222222 100644",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  "@@ -3 +3,2 @@ const CENTS = 100",
  "-export const priceOf = (sku: string) => rates[sku]",
  "+export const priceOf = (sku: string, held = 0) =>",
  "+  rates[sku] - held",
  "@@ -9,2 +9,0 @@",
  "-const unused = 1",
  "-const alsoUnused = 2",
  "@@ -20,0 +19 @@",
  "+export const added = true",
  "diff --git a/src/new.ts b/src/new.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/new.ts",
  "@@ -0,0 +1,2 @@",
  "+export const first = 1",
  "+export const second = 2",
  "\\ No newline at end of file",
].join("\n")

describe("parseHunks", () => {
  it("reads the added line ranges and the removed lines of each changed file", () => {
    expect(parseHunks(DIFF)["src/price.ts"]).toStrictEqual({
      isCreated: false,
      added: [{ lineStart: 3, lineEnd: 4 }, { lineStart: 19, lineEnd: 19 }],
      removed: [
        { afterLine: 2, lines: ["export const priceOf = (sku: string) => rates[sku]"] },
        { afterLine: 9, lines: ["const unused = 1", "const alsoUnused = 2"] },
      ],
    })
  })

  it("marks a file the change creates", () => {
    expect(parseHunks(DIFF)["src/new.ts"]).toStrictEqual({
      isCreated: true,
      added: [{ lineStart: 1, lineEnd: 2 }],
      removed: [],
    })
  })

  it("keeps a removed line that looks like a file header as a removed line", () => {
    const diff = ["--- a/notes.sql", "+++ b/notes.sql", "@@ -1,2 +1 @@", "--- old comment", "-+++ odd line", "+select 1"].join("\n")

    expect(parseHunks(diff)["notes.sql"]).toStrictEqual({
      isCreated: false,
      added: [{ lineStart: 1, lineEnd: 1 }],
      removed: [{ afterLine: 0, lines: ["-- old comment", "+++ odd line"] }],
    })
  })

  it("reads a file the change deletes as removed lines only", () => {
    const diff = ["--- a/gone.ts", "+++ /dev/null", "@@ -1,2 +0,0 @@", "-one", "-two"].join("\n")

    expect(parseHunks(diff)).toStrictEqual({})
  })

  it("has no hunks for an empty diff", () => {
    expect(parseHunks("")).toStrictEqual({})
  })
})

describe("hunkOfPatch", () => {
  it("reads the added ranges and the removed lines of the patch of one file", () => {
    const patch = ["@@ -1,3 +1,4 @@", " const CENTS = 100", "-export const priceOf = () => 1", "+export const priceOf = () =>", "+  2", " "].join("\n")

    expect(hunkOfPatch(patch, false)).toStrictEqual({
      added: [{ lineStart: 2, lineEnd: 3 }],
      removed: [{ afterLine: 1, lines: ["export const priceOf = () => 1"] }],
      isCreated: false,
    })
  })

  it("marks the hunk of a created file, and reads a removed line that looks like a file header as a line", () => {
    expect(hunkOfPatch("@@ -0,0 +1 @@\n+one", true)).toStrictEqual({ added: [{ lineStart: 1, lineEnd: 1 }], removed: [], isCreated: true })
    expect(hunkOfPatch("@@ -1,2 +1 @@\n one\n--- two", false).removed).toStrictEqual([{ afterLine: 1, lines: ["-- two"] }])
  })

  it("reads no change from a file with no patch", () => {
    expect(hunkOfPatch("", false)).toStrictEqual({ added: [], removed: [], isCreated: false })
  })
})
