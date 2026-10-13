import { join } from "node:path"
import { createImportFileStore } from "@/utils/import-file-store"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const KEY = { repositoryName: "storefront", targetId: "branch-feature/web" }

describe("createImportFileStore", () => {
  it("names one file per review target under the data directory, with the name encoded", async () => {
    await withTemporaryFolder(async (dataPath) => {
      expect(createImportFileStore(dataPath).pathOf(KEY)).toBe(join(dataPath, "imports", "storefront", "branch-feature%2Fweb.json"))
      await Promise.resolve()
    })
  })

  it("reads the file an agent put there, and removes it", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = createImportFileStore(dataPath)
      await expect(store.read(KEY)).resolves.toBeNull()
      await writeText(store.pathOf(KEY), "fetched")

      await expect(store.read(KEY)).resolves.toBe("fetched")
      await store.remove(KEY)
      await expect(store.read(KEY)).resolves.toBeNull()
    })
  })
})
