import { unwrapSoftBreaks } from "@/procedures/list-configurations/utils/unwrap-soft-breaks"

describe("unwrapSoftBreaks", () => {
  it("joins the wrapped lines of a paragraph and keeps the blank line between paragraphs", () => {
    expect(unwrapSoftBreaks("A noun names which code this is about but not why\nthe reader is shown it.\n\n**Past tense** only.")).toBe(
      "A noun names which code this is about but not why the reader is shown it.\n\n**Past tense** only.",
    )
  })

  it("joins the wrapped lines of a list item and keeps each item on its own line", () => {
    expect(unwrapSoftBreaks("- first item that\n  wraps\n- second item\n1. numbered")).toBe("- first item that wraps\n- second item\n1. numbered")
  })

  it("leaves headings, tables and fenced code as they are", () => {
    const markdown = "## Kind\nChoose one.\n\n| a | b |\n| - | - |\n\n```ts\nconst a = 1\nconst b = 2\n```\nAfter."

    expect(unwrapSoftBreaks(markdown)).toBe(markdown)
  })
})
