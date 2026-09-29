import * as assert from "assert"
import { readFileSync } from "node:fs"
import * as path from "path"
import { resolveSome } from "../../../lib/schemas/configurationIndex"
import { defaultRead, descriptionRead } from "../../../lib/schemas/defaultProfile"

/**
 * Every field the skill tells an agent to fetch is a field that exists.
 *
 * The skill names paths in prose — `get-instructions { fields: ["blast"] }` —
 * and prose does not typecheck. A field renamed in `preferences.ts` leaves the
 * instruction pointing at nothing, and the failure lands on the agent mid-run
 * as a refusal naming a path its own instructions told it to ask for.
 *
 * This is the same class of rot that left `entries` and `add-diagram-entries`
 * in the skills for months after the schema dropped them. Cheap to catch here.
 */
const skill = readFileSync(
  path.join(__dirname, "..", "..", "..", "..", "plugin", "skills", "review", "SKILL.md"),
  "utf8",
)

/** Every path named inside a `fields: [ … ]` argument in the skill's prose. */
function namedFields(): string[] {
  const found = new Set<string>()
  for (const call of skill.matchAll(/fields:\s*\[([^\]]*)\]/g)) {
    for (const quoted of (call[1] ?? "").matchAll(/"([^"]+)"/g)) {
      found.add(quoted[1] as string)
    }
  }
  return [...found]
}

suite("the review skill's get-instructions arguments", () => {
  test("names at least one field, so the regex is not silently matching nothing", () => {
    assert.ok(namedFields().length > 5, "found no fields: [ … ] arguments in the skill")
  })

  test("every field it names resolves", () => {
    const { unknown } = resolveSome(defaultRead, descriptionRead, namedFields())
    assert.deepStrictEqual(
      unknown,
      [],
      `the skill tells the agent to fetch ${unknown.join(", ")}, which no field answers to`,
    )
  })

  /*
   * A bare mention is fine in two places and nowhere else: the sentence framing
   * what the tool is, and the description of the no-argument call. Everywhere
   * else an agent is being told to fetch something without being told what.
   */
  test("every instruction to fetch says what to fetch", () => {
    const bare = skill
      .split("\n")
      .map((line, at) => ({ line, at: at + 1 }))
      .filter(({ line }) => line.includes("get-instructions"))
      .filter(({ line }) => !line.includes("fields:"))
      .filter(({ line }) => !/with no\b|no arguments|which bodies are on|Everything about the format/.test(line))
    assert.deepStrictEqual(
      bare.map((one) => one.at),
      [],
      `these lines name get-instructions without arguments: ${bare
        .map((one) => `${String(one.at)}: ${one.line.trim()}`)
        .join(" | ")}`,
    )
  })
})
