import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  artifactFormat,
  BASE_PRESET_NAME,
  codeLinks,
  configurations,
  DEFAULT_CONFIGURATIONS_FOLDER,
  FIELD_CONFIGURATIONS,
  INSTRUCTION_FIELDS,
  PRESET_NAMES,
  PRESET_SECTIONS,
  presetInstructionKeys,
  SECTION_FIELD_PATHS,
  SECTION_NAMES,
  reviewArtifactSchema,
  SYSTEM_INSTRUCTIONS_FOLDER,
  systemInstructionKeys,
  writingStyle,
} from "@/index"

const INSTRUCTION_FILE_EXTENSION = ".md"
const SOURCE_PATH = fileURLToPath(new URL("..", import.meta.url))
const SYSTEM_PATH = join(SOURCE_PATH, SYSTEM_INSTRUCTIONS_FOLDER)
const PRESETS_PATH = join(SOURCE_PATH, DEFAULT_CONFIGURATIONS_FOLDER)
const BASE_PRESET_PATH = join(PRESETS_PATH, BASE_PRESET_NAME)

const keysIn = async (folderPath: string): Promise<string[]> =>
  (await readdir(folderPath))
    .filter((name) => name.endsWith(INSTRUCTION_FILE_EXTENSION))
    .map((name) => name.slice(0, -INSTRUCTION_FILE_EXTENSION.length))
    .sort((first, second) => first.localeCompare(second))

const sorted = (keys: readonly string[]): string[] => [...keys].sort((first, second) => first.localeCompare(second))

const textsIn = async (folderPath: string): Promise<string[]> =>
  await Promise.all(
    (await keysIn(folderPath)).map(
      async (key) => await readFile(join(folderPath, `${key}${INSTRUCTION_FILE_EXTENSION}`), "utf8"),
    ),
  )

describe("the instruction catalog", () => {
  it("has one system instruction file per field, and no file without a field", async () => {
    await expect(keysIn(SYSTEM_PATH)).resolves.toStrictEqual(sorted(systemInstructionKeys()))
  })

  it("has one Standard file per editable field and per option, and no file without one", async () => {
    await expect(keysIn(BASE_PRESET_PATH)).resolves.toStrictEqual(sorted(presetInstructionKeys()))
  })

  it("ships no empty instruction", async () => {
    const texts = [...await textsIn(SYSTEM_PATH), ...await textsIn(BASE_PRESET_PATH)]

    expect(texts.filter((text) => text.trim() === "")).toStrictEqual([])
  })

  it("names every field once", () => {
    const paths = INSTRUCTION_FIELDS.map((field) => field.path)

    expect(new Set(paths).size).toBe(paths.length)
  })

  it("gives options only to editable fields", () => {
    const staticFieldsWithOptions = INSTRUCTION_FIELDS.filter((field) => !field.isEditable && field.options.length > 0)

    expect(staticFieldsWithOptions).toStrictEqual([])
  })

  it("reads a field's configuration from the schema it is registered on", () => {
    const { context } = reviewArtifactSchema.shape.segments.element.shape

    expect(configurations.get(context)).toMatchObject({
      configurationType: "editable",
      _ui: { title: "Context Section" },
      fieldDescription: "context.md",
      defaultInstruction: "context.md",
    })
  })

  it("lists the three configurations that belong to no field first, then every registered field once", () => {
    expect(FIELD_CONFIGURATIONS.slice(0, 3)).toStrictEqual([writingStyle, codeLinks, artifactFormat])
    expect(new Set(FIELD_CONFIGURATIONS).size).toBe(FIELD_CONFIGURATIONS.length)
  })

  it("names an editable field's instruction after its description, and each option after the field", () => {
    const misnamed = FIELD_CONFIGURATIONS.filter((configuration) =>
      configuration.configurationType === "editable"
      && (configuration.defaultInstruction !== configuration.fieldDescription
        || Object.entries(configuration.values ?? {}).some(([option, file]) =>
          file !== configuration.fieldDescription.replace(INSTRUCTION_FILE_EXTENSION, `.${option}${INSTRUCTION_FILE_EXTENSION}`))))

    expect(misnamed).toStrictEqual([])
  })

  it("switches every section on or off for every preset", () => {
    expect(Object.keys(PRESET_SECTIONS)).toStrictEqual([...PRESET_NAMES])
    expect(Object.values(PRESET_SECTIONS).map((switches) => Object.keys(switches))).toStrictEqual(
      PRESET_NAMES.map(() => [...SECTION_NAMES]),
    )
  })

  it("holds a folder only for a preset, with no file that is not an editable field or an option", async () => {
    const folderNames = (await readdir(PRESETS_PATH, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    const keysByFolder = await Promise.all(folderNames.map(async (name) => await keysIn(join(PRESETS_PATH, name))))
    const knownKeys = presetInstructionKeys()

    expect(folderNames.filter((name) => !PRESET_NAMES.some((preset) => preset === name))).toStrictEqual([])
    expect(keysByFolder.flat().filter((key) => !knownKeys.includes(key))).toStrictEqual([])
  })

  it("ships no empty instruction in any preset", async () => {
    const folderNames = (await readdir(PRESETS_PATH, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    const texts = (await Promise.all(folderNames.map(async (name) => await textsIn(join(PRESETS_PATH, name))))).flat()

    expect(texts.filter((text) => text.trim() === "")).toStrictEqual([])
  })

  it("names the fields of every section by a path a field starts with", () => {
    const paths = INSTRUCTION_FIELDS.map((field) => field.path)
    const unusedSections = SECTION_NAMES.filter((section) => !paths.some((path) => path.startsWith(SECTION_FIELD_PATHS[section])))

    expect(unusedSections).toStrictEqual([])
  })
})
