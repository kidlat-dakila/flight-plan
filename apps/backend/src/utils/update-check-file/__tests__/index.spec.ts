import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"
import { createUpdateCheckFile } from "@/utils/update-check-file"

const check = { checkedAt: "2026-10-21T09:00:00.000Z", latestVersion: "0.2.0" }

describe("createUpdateCheckFile", () => {
  it("reads no check before one is stored", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(createUpdateCheckFile(dataPath).read()).resolves.toBeNull()
    })
  })

  it("keeps the check for a file opened later on the same folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createUpdateCheckFile(dataPath).write(check)

      await expect(createUpdateCheckFile(dataPath).read()).resolves.toStrictEqual(check)
    })
  })

  it.each(["{ broken", "{\"checkedAt\":\"yesterday\",\"latestVersion\":\"0.2.0\"}", "{\"checkedAt\":\"2026-10-21T09:00:00.000Z\"}"])(
    "reads no check from %s",
    async (text) => {
      await withTemporaryFolder(async (dataPath) => {
        await writeFile(join(dataPath, "update-check.json"), text)

        await expect(createUpdateCheckFile(dataPath).read()).resolves.toBeNull()
      })
    },
  )

  it("fails silently when the data folder cannot hold the file", async () => {
    await withTemporaryFolder(async (folder) => {
      const dataPath = join(folder, "not-a-folder")
      await writeFile(dataPath, "")

      await expect(createUpdateCheckFile(dataPath).write(check)).resolves.toBeUndefined()
      await expect(createUpdateCheckFile(dataPath).read()).resolves.toBeNull()
    })
  })

  it("reads no check when the file is a folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await mkdir(join(dataPath, "update-check.json"))

      await expect(createUpdateCheckFile(dataPath).read()).resolves.toBeNull()
    })
  })
})
