import { describe, expect, test } from "vitest"
import { z } from "zod"
import { buildExample } from "../buildExample"
import type { FieldConfiguration } from "../preferences"

const leaf = (exampleValue: string | number | boolean): FieldConfiguration => ({
  version: 0.1,
  configurationType: "static",
  fieldDescription: "x.md",
  exampleValue,
})

describe("buildExample", () => {
  test("uses a leaf's exampleValue for a primitive", () => {
    const reg = z.registry<FieldConfiguration>()
    const s = z.string().register(reg, leaf("Refuses an order"))
    expect(buildExample(s, reg)).toBe("Refuses an order")
  })

  test("assembles an object from its leaves' exampleValues", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .object({
        id: z.string().register(reg, leaf("n12")),
        hop: z.number().register(reg, leaf(2)),
        changed: z.boolean().register(reg, leaf(true)),
      })
      .strict()
    expect(buildExample(schema, reg)).toEqual({ id: "n12", hop: 2, changed: true })
  })

  test("wraps a leaf exampleValue in an array for an array field", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z.array(z.string().register(reg, leaf("a summary line")))
    expect(buildExample(schema, reg)).toEqual(["a summary line"])
  })

  test("uses an array field's own exampleValue as its single element", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z.array(z.string()).register(reg, leaf("Modified hasStock()."))
    expect(buildExample(schema, reg)).toEqual(["Modified hasStock()."])
  })

  test("unwraps optional and picks the enum's exampleValue", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z.enum(["breaks", "unaffected"]).register(reg, leaf("breaks")).optional()
    expect(buildExample(schema, reg)).toBe("breaks")
  })

  test("stops recursion: a self-referential children array comes out empty", () => {
    const reg = z.registry<FieldConfiguration>()
    const node: z.ZodType = z.lazy(() =>
      z
        .object({
          label: z.string().register(reg, leaf("a label")),
          children: z.array(node).optional(),
        })
        .strict(),
    )
    expect(buildExample(node, reg)).toEqual({ label: "a label", children: [] })
  })

  test("returns a structural field's exampleOverride verbatim", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z
      .array(z.object({ path: z.string() }).strict())
      .register(reg, {
        version: 0.1,
        configurationType: "static",
        fieldDescription: "x.md",
        exampleOverride: [{ path: "src/a.ts", lines: [1, 2] }],
      })
    expect(buildExample(schema, reg)).toEqual([{ path: "src/a.ts", lines: [1, 2] }])
  })

  test("falls back by type when a leaf has no exampleValue", () => {
    const reg = z.registry<FieldConfiguration>()
    const schema = z.object({ n: z.number(), b: z.boolean(), s: z.string() }).strict()
    expect(buildExample(schema, reg)).toEqual({ n: 0, b: true, s: "…" })
  })
})
