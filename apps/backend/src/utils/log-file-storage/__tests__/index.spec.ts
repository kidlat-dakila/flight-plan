import { mkdir, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { errorEntryOf } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import { createLogFileStorage, logsFolderOf } from "@/utils/log-file-storage"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const ENTRY = errorEntryOf("20261023-142530-000001", "It broke.")

describe("createLogFileStorage", () => {
  it("keeps each entry as a JSON file named by its id in the logs folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const storage = createLogFileStorage(dataPath)

      await storage.write(ENTRY)

      expect(storage.folderPath).toBe(join(dataPath, "logs"))
      await expect(readdir(logsFolderOf(dataPath))).resolves.toStrictEqual(["20261023-142530-000001.json"])
      await expect(createLogFileStorage(dataPath).read(ENTRY.id)).resolves.toStrictEqual(ENTRY)
    })
  })

  it("lists only the files named like a log", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const storage = createLogFileStorage(dataPath)
      await storage.write(ENTRY)
      await writeFile(join(logsFolderOf(dataPath), "notes.txt"), "")
      await writeFile(join(logsFolderOf(dataPath), "20261023-142530-zzzzzz.json"), "{}")

      await expect(storage.listIds()).resolves.toStrictEqual([ENTRY.id])
    })
  })

  it("lists nothing before the first log", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(createLogFileStorage(dataPath).listIds()).resolves.toStrictEqual([])
    })
  })

  it.each(["../setup", "20261023-142530-000009"])("reads nothing for %s", async (id) => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(createLogFileStorage(dataPath).read(id)).resolves.toBeNull()
    })
  })

  it("reads nothing from a file that is not a log entry", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await mkdir(logsFolderOf(dataPath))
      await writeFile(join(logsFolderOf(dataPath), `${ENTRY.id}.json`), "{ broken")

      await expect(createLogFileStorage(dataPath).read(ENTRY.id)).resolves.toBeNull()
    })
  })

  it("removes the logs it is given and nothing outside the folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const storage = createLogFileStorage(dataPath)
      await storage.write(ENTRY)
      await writeFile(join(dataPath, "setup.json"), "{}")

      await storage.remove([ENTRY.id, "../setup"])

      await expect(storage.listIds()).resolves.toStrictEqual([])
      await expect(readdir(dataPath)).resolves.toContain("setup.json")
    })
  })
})
