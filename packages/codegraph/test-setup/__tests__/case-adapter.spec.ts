import { GitAdapterError } from "@flightplan/git-forge"
import type { RepositoryFiles } from "@test-setup/apply-diffs"
import { BASE_COMMIT, CASE_BRANCH, createCaseAdapter, HEAD_COMMIT } from "@test-setup/case-adapter"

const BASE_FILES: RepositoryFiles = new Map([["src/price.ts", "export const price = 1\n"]])

const PRICE_DIFF = [
  "diff --git a/src/price.ts b/src/price.ts",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  "@@ -1 +1 @@",
  "-export const price = 1",
  "+export const price = 2",
].join("\n")

const TARGET = { kind: "branch", name: CASE_BRANCH } as const

const caseAdapter = createCaseAdapter({
  readBaseFiles: async () => await Promise.resolve(BASE_FILES),
  diffs: [PRICE_DIFF],
})

describe("createCaseAdapter", () => {
  it("reads a file of the base commit as it is in the repository", async () => {
    await expect(caseAdapter.blob("src/price.ts", BASE_COMMIT)).resolves.toBe("export const price = 1\n")
  })

  it("reads a file of the head commit with the diffs applied", async () => {
    await expect(caseAdapter.blob("src/price.ts", HEAD_COMMIT)).resolves.toBe("export const price = 2\n")
  })

  it("gives the head commit as the tip of the change", async () => {
    await expect(caseAdapter.headSha(TARGET)).resolves.toBe(HEAD_COMMIT)
  })

  it("gives the base commit as the start of the branch", async () => {
    await expect(caseAdapter.branchStart(CASE_BRANCH)).resolves.toBe(BASE_COMMIT)
  })

  it("returns the diffs as the diff of the change", async () => {
    await expect(caseAdapter.diff(TARGET)).resolves.toBe(PRICE_DIFF)
  })

  it("lists the files the diffs change when two commits are compared", async () => {
    const comparison = await caseAdapter.compare(BASE_COMMIT, HEAD_COMMIT)

    expect(comparison.files.map((file) => [file.path, file.status])).toStrictEqual([["src/price.ts", "modified"]])
  })

  it("refuses a file that is not in the repository", async () => {
    await expect(caseAdapter.blob("src/missing.ts", HEAD_COMMIT)).rejects.toThrow(GitAdapterError)
  })

  it("refuses a commit it does not know", async () => {
    await expect(caseAdapter.blob("src/price.ts", "3333333")).rejects.toThrow("has no commit 3333333")
  })

  it("refuses what only a forge can answer", async () => {
    await expect(caseAdapter.viewer()).rejects.toThrow("cannot read the viewer")
  })
})
