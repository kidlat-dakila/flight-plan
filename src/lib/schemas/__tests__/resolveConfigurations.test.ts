import { describe, expect, test } from "vitest"
import { DEFAULT_SECTIONS, defaultRead, descriptionRead } from "../defaultProfile"
import { resolveConfigurations } from "../resolveConfigurations"

describe("resolveConfigurations", () => {
  const resolved = resolveConfigurations(defaultRead, descriptionRead, DEFAULT_SECTIONS)
  const byPath = (p: string) => resolved.configs.find((c) => c.path.join(".") === p)

  test("carries the section on/off state through", () => {
    expect(resolved.sections).toEqual(DEFAULT_SECTIONS)
  })

  test("every config carries a field description", () => {
    for (const c of resolved.configs) expect(c.fieldDescription.length).toBeGreaterThan(0)
  })

  test("an editable field carries both description and instruction", () => {
    const label = byPath("diagram.nodes.label")
    expect(label?.configurationType).toBe("editable")
    expect(label?.ui?.title).toBe("Diagram node label")
    expect(label?.fieldDescription.length).toBeGreaterThan(0)
    expect((label?.instruction ?? "").length).toBeGreaterThan(0)
  })

  test("a static field carries a description but no instruction", () => {
    const id = byPath("diagram.nodes.id")
    expect(id?.configurationType).toBe("static")
    expect(id?.fieldDescription.length).toBeGreaterThan(0)
    expect(id?.instruction).toBeUndefined()
  })

  test("includes the static writing style: a description, always present, no instruction", () => {
    const sws = byPath("staticWritingStyle")
    expect(sws?.configurationType).toBe("static")
    expect(sws?.fieldDescription).toContain("code link")
    expect(sws?.instruction).toBeUndefined()
  })

  test("resolves enum option meanings", () => {
    const kind = byPath("findings.kind")
    expect(kind?.values?.bug?.length).toBeGreaterThan(0)
    expect(kind?.values?.question?.length).toBeGreaterThan(0)
  })

  test("attaches an assembled example: a leaf's is its value, a container's is an object", () => {
    expect(byPath("diagram.nodes.label")?.example).toBe("Refuses an order it cannot fulfil")
    const node = byPath("diagram.nodes")?.example as Array<Record<string, unknown>>
    expect(node[0]).toMatchObject({ id: "hasStock", type: "guard", label: "Refuses an order it cannot fulfil" })
  })
})
