import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createInitFile } from "@/utils/init-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

describe("createInitFile", () => {
  it("reads no record before a migration runs", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(createInitFile(dataPath).read()).resolves.toBeNull()
    })
  })

  it("keeps the migrated version for a file opened later on the same folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createInitFile(dataPath).write({ migratedVersion: "0.1.10" })

      await expect(createInitFile(dataPath).read()).resolves.toStrictEqual({ migratedVersion: "0.1.10" })
    })
  })

  it.each(["{ broken", "{\"migratedVersion\":10}", "{}"])("reads no record from %s", async (text) => {
    await withTemporaryFolder(async (dataPath) => {
      await writeFile(join(dataPath, "init.json"), text)

      await expect(createInitFile(dataPath).read()).resolves.toBeNull()
    })
  })
})
