import { parseHunks } from "@/procedures/request-review/utils/scaffold/hunks"

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
