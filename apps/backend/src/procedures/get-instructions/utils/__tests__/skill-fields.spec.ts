import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { INSTRUCTION_FIELDS } from "@flightplan/configurations"

const SKILL_PATH = fileURLToPath(new URL("../../../../../../../plugin/skills/review/SKILL.md", import.meta.url))
const FIELD_LIST_PATTERN = /fields: \[([^\]]+)\]/g
const QUOTED_PATTERN = /"([^"]+)"/g

const fieldPathsIn = (skill: string): string[] => [
  ...new Set(
    [...skill.matchAll(FIELD_LIST_PATTERN)].flatMap((list) => [...list[1].matchAll(QUOTED_PATTERN)].map((quoted) => quoted[1])),
  ),
]

describe("the review skill", () => {
  it("asks get-instructions only for fields that exist", async () => {
    const knownPaths = INSTRUCTION_FIELDS.map((field) => field.path)

    const askedPaths = fieldPathsIn(await readFile(SKILL_PATH, "utf8"))

    expect(askedPaths.length).toBeGreaterThan(10)
    expect(askedPaths.filter((path) => !knownPaths.includes(path))).toStrictEqual([])
  })
})
