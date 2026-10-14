import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { SavedConfiguration } from "@/procedures/list-configurations/utils/configuration"
import { FileConfigurationStore } from "@/utils/configuration-file-store"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"
import { PRESET_CONTEXT_CODE_BLOCK_KINDS, PRESET_SECTIONS } from "@flightplan/configurations"

const sortedNamesOf = async (folderPath: string): Promise<string[]> =>
  [...await readdir(folderPath)].sort((one, two) => one.localeCompare(two))

const TERSE: SavedConfiguration = {
  id: "custom-terse",
  name: "Terse",
  preset: "minimal",
  sections: PRESET_SECTIONS.minimal,
  contextCodeBlockKinds: PRESET_CONTEXT_CODE_BLOCK_KINDS.minimal,
  instructions: { context: "Two sentences.", writingStyle: "Fragments." },
}

const CHANGED_STANDARD: SavedConfiguration = {
  id: "standard",
  name: "Standard",
  preset: "standard",
  sections: PRESET_SECTIONS.standard,
  contextCodeBlockKinds: PRESET_CONTEXT_CODE_BLOCK_KINDS.standard,
  instructions: { context: "One paragraph." },
}

describe("FileConfigurationStore", () => {
  it("reads no configuration before anything is saved", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await expect(new FileConfigurationStore(dataPath).read()).resolves.toStrictEqual([])
    })
  })

  it("keeps the configurations for a store opened later on the same folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await new FileConfigurationStore(dataPath).write([CHANGED_STANDARD, TERSE])

      await expect(new FileConfigurationStore(dataPath).read()).resolves.toStrictEqual([TERSE, CHANGED_STANDARD])
    })
  })

  it("writes each instruction as a Markdown file in the configuration's folder", async () => {
    await withTemporaryFolder(async (dataPath) => {
      await new FileConfigurationStore(dataPath).write([TERSE])

      const folderPath = join(dataPath, "configurations", "custom-terse")
      await expect(sortedNamesOf(folderPath)).resolves.toStrictEqual(["configuration.json", "context.md", "writingStyle.md"])
      await expect(readFile(join(folderPath, "context.md"), "utf8")).resolves.toBe("Two sentences.")
    })
  })

  it("removes the file of a reset instruction and the folder of a deleted configuration", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const store = new FileConfigurationStore(dataPath)
      await store.write([TERSE, CHANGED_STANDARD])

      await store.write([{ ...TERSE, instructions: { context: "Two sentences." } }])

      await expect(sortedNamesOf(join(dataPath, "configurations"))).resolves.toStrictEqual(["custom-terse"])
      await expect(sortedNamesOf(join(dataPath, "configurations", "custom-terse"))).resolves.toStrictEqual(["configuration.json", "context.md"])
    })
  })

  it("leaves the settings and a folder that holds no configuration as they are", async () => {
    await withTemporaryFolder(async (dataPath) => {
      const configurationsPath = join(dataPath, "configurations")
      await mkdir(join(configurationsPath, "notes"), { recursive: true })
      await writeFile(join(configurationsPath, "notes", "context.md"), "A note.")
      await writeFile(join(configurationsPath, "settings.json"), "{}")
      const store = new FileConfigurationStore(dataPath)

      await store.write([TERSE])
      await store.write([])

      await expect(store.read()).resolves.toStrictEqual([])
      await expect(sortedNamesOf(configurationsPath)).resolves.toStrictEqual(["notes", "settings.json"])
    })
  })
})
