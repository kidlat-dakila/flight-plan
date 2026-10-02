import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { readTextOrNull, writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "./temporary-folder"

describe("readTextOrNull", () => {
  it("reads a missing file as null", async () => {
    await withTemporaryFolder(async (folder) => {
      await expect(readTextOrNull(join(folder, "missing.json"))).resolves.toBeNull()
    })
  })

  it("fails when the path cannot be read as a file", async () => {
    await withTemporaryFolder(async (folder) => {
      await expect(readTextOrNull(folder)).rejects.toThrow("EISDIR")
    })
  })
})

describe("writeText", () => {
  it("creates the folders above the file", async () => {
    await withTemporaryFolder(async (folder) => {
      const path = join(folder, "configurations", "settings.json")

      await writeText(path, "{}")

      await expect(readFile(path, "utf8")).resolves.toBe("{}")
      await expect(readTextOrNull(path)).resolves.toBe("{}")
    })
  })
})
