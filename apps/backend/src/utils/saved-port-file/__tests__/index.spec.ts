import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createSavedPortFile } from "@/utils/saved-port-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

describe("createSavedPortFile", () => {
  it("reads no port before one is saved", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(createSavedPortFile(dataPath).read()).resolves.toBeNull()
    })
  })

  it("keeps the port for a file opened later on the same folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await createSavedPortFile(dataPath).write(24747)

      await expect(createSavedPortFile(dataPath).read()).resolves.toBe(24747)
    })
  })

  it.each(["{ broken", "{\"port\":\"24747\"}", "{\"port\":-1}"])("reads no port from %s", async (text) => {
    await withTemporaryFolder(async (dataPath) => {
      await writeFile(join(dataPath, "server.json"), text)

      await expect(createSavedPortFile(dataPath).read()).resolves.toBeNull()
    })
  })
})
