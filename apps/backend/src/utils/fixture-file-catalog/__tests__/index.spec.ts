import { join } from "node:path"
import { createFixtureFileCatalog } from "@/utils/fixture-file-catalog"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const snapshotOf = (title: string): string => JSON.stringify({ title, context: [], diff: [], codegraph: { segments: [] } })

describe("createFixtureFileCatalog", () => {
  it("lists the case folders in order", async () => {
    await withTemporaryFolder(async (testCasesPath) => {
      await writeText(join(testCasesPath, "typescript", "snapshots", "added-function-a.snapshot.json"), snapshotOf("Added function a"))
      await writeText(join(testCasesPath, "react-spa", "snapshots", "added-function-a.snapshot.json"), snapshotOf("Added function a"))

      await expect(createFixtureFileCatalog(testCasesPath).listCaseNames()).resolves.toStrictEqual(["react-spa", "typescript"])
    })
  })

  it("reads a case as a local git repository with a pull request per snapshot", async () => {
    await withTemporaryFolder(async (testCasesPath) => {
      await writeText(join(testCasesPath, "typescript", "snapshots", "deleted-function-b.snapshot.json"), snapshotOf("Deleted function b"))
      await writeText(join(testCasesPath, "typescript", "snapshots", "added-function-a.snapshot.json"), snapshotOf("Added function a"))

      await expect(createFixtureFileCatalog(testCasesPath).readRepository("typescript")).resolves.toMatchObject({
        name: "typescript",
        path: join(testCasesPath, "typescript"),
        forge: "git",
        targets: [
          { kind: "pull-request", number: 1, title: "Added function a", branch: "added-function-a" },
          { kind: "pull-request", number: 2, title: "Deleted function b", branch: "deleted-function-b" },
        ],
      })
    })
  })

  it("refuses a case name that is not a folder name", async () => {
    await withTemporaryFolder(async (testCasesPath) => {
      await expect(createFixtureFileCatalog(testCasesPath).readRepository("../secrets")).rejects.toThrow("No test case is named ../secrets.")
    })
  })
})
