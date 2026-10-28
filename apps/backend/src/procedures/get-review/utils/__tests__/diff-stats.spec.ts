import { fileChangesOf } from "@/procedures/get-review/utils/diff-stats"

const MODIFIED_DIFF = [
  "diff --git a/src/price.ts b/src/price.ts",
  "index 1111111..2222222 100644",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  "@@ -1,2 +1,3 @@",
  "-export const price = 1",
  "-export const tax = 2",
  "+export const price = (sku: string) =>",
  "+  rates[sku]",
  "+++counter",
  "@@ -9 +10 @@",
  "-const rounding = 0",
  "+const rounding = 2",
  "\\ No newline at end of file",
].join("\n")

const ADDED_DIFF = [
  "diff --git a/docs/notes.md b/docs/notes.md",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/docs/notes.md",
  "@@ -0,0 +1,2 @@",
  "+# Notes",
  "+--- a horizontal rule",
].join("\n")

const DELETED_DIFF = [
  "diff --git a/README b/README",
  "deleted file mode 100644",
  "--- a/README",
  "+++ /dev/null",
  "@@ -1 +0,0 @@",
  "-Read me",
].join("\n")

const BINARY_DIFF = [
  "diff --git a/assets/logo.png b/assets/logo.png",
  "new file mode 100644",
  "Binary files /dev/null and b/assets/logo.png differ",
].join("\n")

describe("fileChangesOf", () => {
  it("counts the added and removed lines of a modified file across its hunks, and none of the headers", () => {
    expect(fileChangesOf(MODIFIED_DIFF)).toStrictEqual([{ path: "src/price.ts", kind: "modified", addedCount: 4, removedCount: 3 }])
  })

  it("reads an added, a deleted and a binary file with their change kinds", () => {
    expect(fileChangesOf([ADDED_DIFF, DELETED_DIFF, BINARY_DIFF].join("\n"))).toStrictEqual([
      { path: "docs/notes.md", kind: "added", addedCount: 2, removedCount: 0 },
      { path: "README", kind: "deleted", addedCount: 0, removedCount: 1 },
      { path: "assets/logo.png", kind: "added", addedCount: 0, removedCount: 0 },
    ])
  })

  it("reads the path of a file whose name has spaces from its header", () => {
    const diff = ["diff --git a/docs/release notes.md b/docs/release notes.md", "@@ -1 +1 @@", "-Old", "+New"].join("\n")

    expect(fileChangesOf(diff)).toStrictEqual([{ path: "docs/release notes.md", kind: "modified", addedCount: 1, removedCount: 1 }])
  })

  it("reads no file from an empty diff", () => {
    expect(fileChangesOf("")).toStrictEqual([])
  })
})
