import { describe, expect, test } from "vitest"
import { configurationIndex, resolveSome } from "../configurationIndex"
import { DEFAULT_SECTIONS, defaultRead, descriptionRead } from "../defaultProfile"
import { resolveConfigurations } from "../resolveConfigurations"

describe("configurationIndex", () => {
  const index = configurationIndex(defaultRead, descriptionRead, DEFAULT_SECTIONS)

  test("carries the section on/off state through", () => {
    expect(index.sections).toEqual(DEFAULT_SECTIONS)
  })

  /*
   * Nothing inline. The voice and the code-link format used to be carried here
   * on the grounds that they steer every field — which is true of everything,
   * and is how an index grows back into the payload it replaced.
   */
  test("carries no prose at all, only what to fetch", () => {
    expect(JSON.stringify(index)).not.toContain("Wherever prose mentions code")
    for (const one of index.fields) expect(Object.keys(one).sort()).toEqual(["path", "title"])
  })

  test("lists the entries that carry rules, so the agent knows they exist", () => {
    const paths = index.fields.map((one) => one.path)
    for (const key of [
      "writingStyle",
      "staticWritingStyle",
      "documentFormat",
      "blast",
      "diagram",
      "findings",
      "codeWalkthrough.files.waypoints",
    ]) {
      expect(paths).toContain(key)
    }
  })

  test("lists an authored field and leaves a derived one out", () => {
    const paths = index.fields.map((one) => one.path)
    expect(paths).toContain("diagram.nodes.label")
    expect(paths).not.toContain("diagram.nodes.id")
  })

  test("every entry carries the title the settings screen shows", () => {
    for (const one of index.fields) expect(one.title.length).toBeGreaterThan(0)
  })

  /*
   * The whole reason this function exists. The full payload is some seventy
   * kilobytes, which an agent cannot read inline and pays for on every run
   * before it has written a word.
   */
  test("is a small fraction of the full payload", () => {
    const full = JSON.stringify(
      resolveConfigurations(defaultRead, descriptionRead, DEFAULT_SECTIONS),
    ).length
    expect(JSON.stringify(index).length).toBeLessThan(full / 20)
  })
})

describe("resolveSome", () => {
  const some = (paths: string[]) => resolveSome(defaultRead, descriptionRead, paths)

  test("resolves a named editable field whole", () => {
    const { configs, unknown } = some(["diagram.nodes.label"])
    expect(unknown).toEqual([])
    expect(configs).toHaveLength(1)
    expect(configs[0]?.path).toEqual(["diagram", "nodes", "label"])
    expect((configs[0]?.instruction ?? "").length).toBeGreaterThan(0)
    expect(configs[0]?.example).toBe("Refuses an order it cannot fulfil")
  })

  test("resolves a static field too, which the index leaves out", () => {
    const { configs, unknown } = some(["diagram.nodes.id"])
    expect(unknown).toEqual([])
    expect(configs[0]?.configurationType).toBe("static")
    expect(configs[0]?.instruction).toBeUndefined()
  })

  test("resolves several at once, in the order asked", () => {
    const { configs } = some(["findings.kind", "diagram.nodes.label"])
    expect(configs.map((one) => one.path.join("."))).toEqual([
      "findings.kind",
      "diagram.nodes.label",
    ])
  })

  test("names what it did not know rather than returning it empty", () => {
    const { configs, unknown } = some(["diagram.nodes.label", "nodes.colour"])
    expect(configs).toHaveLength(1)
    expect(unknown).toEqual(["nodes.colour"])
  })
})

describe("nearPaths", () => {
  test("offers the fields whose last segment matches a bare one", async () => {
    const { nearPaths } = await import("../configurationIndex")
    expect(nearPaths("label")).toContain("diagram.nodes.label")
  })

  test("offers nothing for a name no field ends in", async () => {
    const { nearPaths } = await import("../configurationIndex")
    expect(nearPaths("colour")).toEqual([])
  })
})
