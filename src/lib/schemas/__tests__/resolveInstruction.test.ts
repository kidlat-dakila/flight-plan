import { describe, expect, test } from "vitest"
import type { FieldConfiguration } from "../preferences"
import { resolveDescription, resolveInstruction, resolveValues } from "../resolveInstruction"

const staticConfig = (
  fieldDescription: string,
  values?: Record<string, string>,
): FieldConfiguration => ({
  version: 0.1,
  configurationType: "static",
  fieldDescription,
  ...(values ? { values } : {}),
})

const editableConfig = (
  fieldDescription: string,
  defaultInstruction: string,
  values?: Record<string, string>,
): FieldConfiguration => ({
  version: 0.1,
  configurationType: "editable",
  _ui: { title: "t", description: "d" },
  fieldDescription,
  defaultInstruction,
  ...(values ? { values } : {}),
})

const never = (): string | undefined => undefined

describe("resolveDescription", () => {
  test("reads the field's fieldDescription path", () => {
    expect(resolveDescription(staticConfig("meta/meta.md"), (p) => `desc:${p}`)).toBe("desc:meta/meta.md")
  })

  test("throws when the description is missing", () => {
    expect(() => resolveDescription(staticConfig("x.md"), () => undefined)).toThrow()
  })
})

describe("resolveInstruction", () => {
  test("reads an editable field's defaultInstruction path", () => {
    const config = editableConfig("d.md", "diagram/diagram.code.title.md")
    expect(resolveInstruction(config, (p) => `how:${p}`)).toBe("how:diagram/diagram.code.title.md")
  })

  test("returns undefined for a static field (it has no instruction)", () => {
    expect(resolveInstruction(staticConfig("x.md"), () => "unused")).toBeUndefined()
  })

  test("throws when an editable instruction is missing", () => {
    expect(() => resolveInstruction(editableConfig("d.md", "x.md"), () => undefined)).toThrow()
  })
})

describe("resolveValues", () => {
  test("reads a static field's .md-path options from the descriptions and passes inline strings through", () => {
    const read = (p: string) => (p.endsWith(".guard.md") ? "the guard meaning" : undefined)
    const config = staticConfig("x.md", {
      typed: "diagram/diagram.code.nodes.node.type.guard.md",
      inline: "It cannot work against the changed code.",
    })
    expect(resolveValues(config, never, read)).toEqual({
      typed: "the guard meaning",
      inline: "It cannot work against the changed code.",
    })
  })

  test("reads an editable field's options from the profile, not the descriptions", () => {
    const config = editableConfig("d.md", "k.md", { bug: "findings/findings.node.kind.bug.md" })
    const profile = (p: string) => `profile:${p}`
    expect(resolveValues(config, profile, () => "shipped")).toEqual({
      bug: "profile:findings/findings.node.kind.bug.md",
    })
  })

  test("throws when an editable option's file is missing", () => {
    const config = editableConfig("d.md", "k.md", { bug: "findings/findings.node.kind.bug.md" })
    expect(() => resolveValues(config, never, () => "shipped")).toThrow()
  })

  test("returns undefined when the field has no values", () => {
    expect(resolveValues(staticConfig("x.md"), never, never)).toBeUndefined()
  })
})
