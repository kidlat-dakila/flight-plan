import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { AT_FORGES } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { FileSetupStore } from "@/utils/setup-file-store"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

describe("FileSetupStore", () => {
  it("reads the empty setup before anything is saved", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(new FileSetupStore(dataPath).read()).resolves.toStrictEqual(EMPTY_SETUP)
    })
  })

  it("keeps the setup for a store opened later on the same folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await new FileSetupStore(dataPath).write(AT_FORGES)

      await expect(new FileSetupStore(dataPath).read()).resolves.toStrictEqual(AT_FORGES)
    })
  })

  it("fails without naming a path when the saved settings are damaged", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await mkdir(join(dataPath, "configurations"))
      await writeFile(join(dataPath, "configurations", "settings.json"), "{ broken")

      await expect(new FileSetupStore(dataPath).read()).rejects.toThrow("The saved settings cannot be read.")
    })
  })
})
