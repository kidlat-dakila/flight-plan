import { describe, expect, test } from "vitest"
import { z } from "zod"
import { ArtifactSchema, configurations } from "../preferences"
import type { FieldConfiguration } from "../preferences"
import { listArtifactConfigurations, walkConfigurations } from "../walkConfigurations"

const editable = (title: string): FieldConfiguration => ({
  version: 0.1,
  configurationType: "editable",
  _ui: { title, description: "d" },
  fieldDescription: `${title}.desc.md`,
  defaultInstruction: `${title}.md`,
})

describe("walkConfigurations", () => {
  test("returns one entry per registered field on a flat object", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .object({
        title: z.string().min(1).register(reg, editable("Title")),
      })
      .strict()

    const entries = walkConfigurations(schema, reg)

    expect(entries).toHaveLength(1)
    expect(entries[0]?.path).toEqual(["title"])
    expect(entries[0]?.configuration._ui?.title).toBe("Title")
  })

  test("descends into a nested object, keeping the key path", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .object({
        body: z.object({ ctx: z.string().register(reg, editable("Ctx")) }).strict(),
      })
      .strict()

    const entries = walkConfigurations(schema, reg)

    expect(entries.map((e) => e.path)).toEqual([["body", "ctx"]])
  })

  test("unwraps optional, array, nullable and default to reach a registered field", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .object({
        opt: z.string().register(reg, editable("Opt")).optional(),
        arr: z.array(z.object({ t: z.string().register(reg, editable("T")) }).strict()),
        nul: z.string().register(reg, editable("Nul")).nullable(),
      })
      .strict()

    const entries = walkConfigurations(schema, reg)

    expect(entries.map((e) => e.path)).toEqual([["opt"], ["arr", "t"], ["nul"]])
  })

  test("walks each option of a discriminated union", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .object({
        meta: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("a"), p: z.string().register(reg, editable("P")) }).strict(),
          z.object({ kind: z.literal("b"), q: z.string().register(reg, editable("Q")) }).strict(),
        ]),
      })
      .strict()

    const entries = walkConfigurations(schema, reg)

    expect(entries.map((e) => e.path)).toEqual([
      ["meta", "p"],
      ["meta", "q"],
    ])
  })

  test("emits a self-recursive (lazy) node's fields once and does not loop", () => {
    const reg = z.registry<FieldConfiguration>()
    const node: z.ZodType = z.lazy(() =>
      z
        .object({
          label: z.string().register(reg, editable("Label")),
          children: z.array(node).optional(),
        })
        .strict(),
    )
    const schema = z.object({ nodes: z.array(node) }).strict()

    const entries = walkConfigurations(schema, reg)

    expect(entries.map((e) => e.path)).toEqual([["nodes", "label"]])
  })
})

describe("walkConfigurations over the real ArtifactSchema", () => {
  const entries = walkConfigurations(ArtifactSchema, configurations)
  const paths = entries.map((e) => e.path.join("."))

  test("reaches top-level, diagram, and recursive diagramNode fields", () => {
    expect(paths).toContain("title")
    expect(paths).toContain("diagram.title")
    expect(paths).toContain("diagram.nodes.label")
  })

  test("emits each recursive shape's field once (no children explosion)", () => {
    expect(paths.filter((p) => p === "diagram.nodes.label")).toHaveLength(1)
    expect(paths.filter((p) => p === "codeWalkthrough.files.waypoints.reading")).toHaveLength(1)
  })

  test("every entry carries a well-formed FieldConfiguration", () => {
    for (const { configuration } of entries) {
      expect(typeof configuration.version).toBe("number")
      expect(["editable", "static"]).toContain(configuration.configurationType)
      expect(typeof configuration.fieldDescription).toBe("string")
      if (configuration.configurationType === "editable") {
        expect(configuration._ui?.title).toBeTruthy()
        expect(typeof configuration.defaultInstruction).toBe("string")
      }
    }
  })
})

describe("listArtifactConfigurations", () => {
  const entries = listArtifactConfigurations()
  const paths = entries.map((e) => e.path.join("."))

  test("includes writingStyle first as an overall instruction", () => {
    expect(entries[0]?.path).toEqual(["writingStyle"])
    expect(entries[0]?.configuration._ui?.title).toBe("Writing style")
  })

  test("then includes the schema-walked fields", () => {
    expect(paths).toContain("title")
    expect(paths).toContain("diagram.nodes.label")
  })
})
