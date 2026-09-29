import { describe, expect, test } from "vitest"
import { buildConfigGroups } from "../configView"
import { DEFAULT_SECTIONS, defaultRead, descriptionRead } from "../defaultProfile"

describe("buildConfigGroups", () => {
  const groups = buildConfigGroups(defaultRead, descriptionRead, DEFAULT_SECTIONS)
  const group = (section: string) => groups.find((g) => g.section === section)

  test("groups are in schema-section order, writingStyle first", () => {
    expect(groups[0]?.section).toBe("writingStyle")
    // No "title" group: title's instruction is static, so it has no editable field.
    expect(groups.map((g) => g.section)).toEqual([
      "writingStyle",
      "contextBody",
      "diagram",
      "blast",
      "codeWalkthrough",
      "findings",
    ])
  })

  test("lists only editable fields (a static field is absent)", () => {
    const diagram = group("diagram")
    const ids = diagram?.items.map((i) => i.id) ?? []
    expect(ids).toContain("diagram.nodes.label") // editable
    expect(ids).not.toContain("diagram.nodes.id") // static
  })

  test("each toggleable body has a body item at the head of its section", () => {
    for (const body of ["diagram", "blast", "codeWalkthrough"] as const) {
      const first = group(body)?.items[0]
      expect(first?.kind).toBe("body")
      expect(first).toMatchObject({ body, on: true })
    }
  })

  test("an editable field carries its title, description, instruction and write path", () => {
    const label = group("diagram")?.items.find((i) => i.id === "diagram.nodes.label")
    expect(label).toMatchObject({
      kind: "field",
      title: "Diagram node label",
      writePath: "diagram/diagram.code.nodes.node.label.md",
    })
    expect((label as { instruction: string }).instruction.length).toBeGreaterThan(0)
    expect((label as { fieldDescription: string }).fieldDescription.length).toBeGreaterThan(0)
  })

  test("an enum field carries a meaning per option, and where each one saves", () => {
    const kind = group("findings")?.items.find((i) => i.id === "findings.kind")
    const values = (kind as { values?: { option: string; instruction: string; writePath: string }[] }).values ?? []
    expect(values.map((v) => v.option)).toEqual(["bug", "risk", "nit", "question"])
    const bug = values.find((v) => v.option === "bug")
    expect((bug?.instruction ?? "").length).toBeGreaterThan(0)
    expect(bug?.writePath).toBe("findings/findings.node.kind.bug.md")
  })

  test("an option's meaning comes from the active profile", () => {
    const edited = buildConfigGroups(
      (p) => (p === "findings/findings.node.kind.bug.md" ? "My bug." : defaultRead(p)),
      descriptionRead,
      DEFAULT_SECTIONS,
    )
    const kind = edited.find((g) => g.section === "findings")?.items.find((i) => i.id === "findings.kind")
    const bug = (kind as { values?: { option: string; instruction: string }[] }).values?.find((v) => v.option === "bug")
    expect(bug?.instruction).toBe("My bug.")
  })

  test("a body item reflects an off section", () => {
    const off = buildConfigGroups(defaultRead, descriptionRead, { ...DEFAULT_SECTIONS, blast: false })
    const body = off.find((g) => g.section === "blast")?.items[0]
    expect(body).toMatchObject({ kind: "body", body: "blast", on: false })
  })
})
