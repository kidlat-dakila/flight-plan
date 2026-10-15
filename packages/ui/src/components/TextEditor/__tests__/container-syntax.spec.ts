import { ACCORDION_MARKERS, formatContainer, parseContainerSource, TABS_MARKERS } from "@/components/TextEditor/containers/container-syntax"

describe("parseContainerSource", () => {
  it("reads a tabs block at the start of the source, with each tab's name and body", () => {
    const source = ":::tabs\n::tab What's added\n- A page.\n  - Its form.\n::tab What's modified\nThe router.\n:::\n\nAfter."

    expect(parseContainerSource(source, TABS_MARKERS)).toStrictEqual({
      raw: ":::tabs\n::tab What's added\n- A page.\n  - Its form.\n::tab What's modified\nThe router.\n:::\n",
      items: [
        { label: "What's added", body: "- A page.\n  - Its form." },
        { label: "What's modified", body: "The router." },
      ],
    })
  })

  it("reads an accordion block with its own markers, and not with the markers of tabs", () => {
    const source = ":::accordion\n::section What's added\n- A page.\n:::"

    expect(parseContainerSource(source, ACCORDION_MARKERS)?.items).toStrictEqual([{ label: "What's added", body: "- A page." }])
    expect(parseContainerSource(source, TABS_MARKERS)).toBeNull()
  })

  it("reads nothing from a block that is never closed, has no item first, or does not start the source", () => {
    expect(parseContainerSource(":::tabs\n::tab What's added\n- A page.", TABS_MARKERS)).toBeNull()
    expect(parseContainerSource(":::tabs\nA page.\n::tab Late\n:::", TABS_MARKERS)).toBeNull()
    expect(parseContainerSource("Before.\n:::tabs\n::tab A\n:::", TABS_MARKERS)).toBeNull()
  })
})

describe("formatContainer", () => {
  it("writes a block the way it is read, leaving an empty body out", () => {
    const items = [{ label: "What's added", body: "- A page." }, { label: "What's removed", body: "" }]

    expect(formatContainer(items, TABS_MARKERS)).toBe(":::tabs\n::tab What's added\n- A page.\n::tab What's removed\n:::")
    expect(formatContainer(items, ACCORDION_MARKERS)).toBe(":::accordion\n::section What's added\n- A page.\n::section What's removed\n:::")
    expect(parseContainerSource(formatContainer(items, ACCORDION_MARKERS), ACCORDION_MARKERS)?.items).toStrictEqual(items)
  })
})
