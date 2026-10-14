import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { listFieldPaths, resolveFields } from "@/procedures/get-instructions/utils/resolve-instructions"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { InstructionFileReader } from "@/utils/instruction-file-reader"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"
import { ALL_SECTIONS_ON, PRESET_NAMES, PRESET_CONTEXT_CODE_BLOCK_KINDS } from "@flightplan/configurations"

const SHIPPED_CONFIGURATIONS_PATH = fileURLToPath(new URL("../../../../../../packages/configurations/src", import.meta.url))

describe("InstructionFileReader", () => {
  it("reads the system instructions and each preset folder, keyed by file name", async () => {
    await withTemporaryFolder(async (configurationsPath) => {
      await writeText(join(configurationsPath, "system-instructions", "context.md"), "What the context is.")
      await writeText(join(configurationsPath, "system-instructions", "notes.txt"), "Not an instruction.")
      await writeText(join(configurationsPath, "default-configurations", "standard", "context.md"), "How to write it.")

      const texts = await new InstructionFileReader(configurationsPath).read()

      expect([...texts.system]).toStrictEqual([["context", "What the context is."]])
      expect([...texts.presets.keys()]).toStrictEqual(["standard"])
      expect(texts.presets.get("standard")?.get("context")).toBe("How to write it.")
    })
  })

  it("reads the files once and serves every later call from memory", async () => {
    await withTemporaryFolder(async (configurationsPath) => {
      const contextPath = join(configurationsPath, "system-instructions", "context.md")
      await writeText(contextPath, "First.")
      await writeText(join(configurationsPath, "default-configurations", "standard", "writingStyle.md"), "Voice.")
      const reader = new InstructionFileReader(configurationsPath)
      await reader.read()
      await writeText(contextPath, "Second.")

      const texts = await reader.read()

      expect(texts.system.get("context")).toBe("First.")
    })
  })

  it("fails when the instructions are not there, and reads them once they are", async () => {
    await withTemporaryFolder(async (configurationsPath) => {
      const reader = new InstructionFileReader(configurationsPath)

      await expect(reader.read()).rejects.toThrow("ENOENT")
      await writeText(join(configurationsPath, "system-instructions", "context.md"), "What the context is.")
      await writeText(join(configurationsPath, "default-configurations", "standard", "writingStyle.md"), "Voice.")

      await expect(reader.read()).resolves.toMatchObject({ system: new Map([["context", "What the context is."]]) })
    })
  })

  it("finds a text for every field each preset writes in the shipped configurations", async () => {
    const texts = await new InstructionFileReader(SHIPPED_CONFIGURATIONS_PATH).read()
    const writtenPathsOf = (preset: (typeof PRESET_NAMES)[number]): string[] =>
      listFieldPaths({ sections: ALL_SECTIONS_ON, requiresContextCodeBlocks: PRESET_CONTEXT_CODE_BLOCK_KINDS[preset].length > 0 })

    const resolutions = PRESET_NAMES.map((preset) => resolveFields(writtenPathsOf(preset), texts, shippedConfigurationOf(preset)).kind)

    expect(resolutions).toStrictEqual(["resolved", "resolved", "resolved", "resolved"])
  })
})
