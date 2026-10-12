import { parseInlines, parseProse } from "@/prose/parse-prose"

const KNOWN = new Set(["src/price.ts#priceOf"])

describe("parseProse", () => {
  it("splits paragraphs and marks inline code and bold text", () => {
    expect(parseProse("Reads `held` **first**.\n\nThen stops.", KNOWN)).toStrictEqual([
      {
        kind: "paragraph",
        inlines: [
          { kind: "text", text: "Reads " },
          { kind: "code", text: "held" },
          { kind: "text", text: " " },
          { kind: "strong", text: "first" },
          { kind: "text", text: "." },
        ],
      },
      { kind: "paragraph", inlines: [{ kind: "text", text: "Then stops." }] },
    ])
  })

  it("turns a code link it knows into a link with its id", () => {
    expect(parseProse("See [`priceOf()`](code:src/price.ts#priceOf).", KNOWN)).toStrictEqual([
      {
        kind: "paragraph",
        inlines: [
          { kind: "text", text: "See " },
          { kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" },
          { kind: "text", text: "." },
        ],
      },
    ])
  })

  it("keeps the label of a code link it cannot resolve, without an id", () => {
    expect(parseInlines("[the loop](code:src/gone.ts#L1-2)", KNOWN)).toStrictEqual([
      { kind: "code-link", text: "the loop", isCode: false, linkId: null },
    ])
  })

  it("reads a heading apart from the paragraphs and the list under it", () => {
    expect(parseProse("Why it matters.\n\n## Overview\n\n- First", KNOWN)).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "text", text: "Why it matters." }] },
      { kind: "heading", inlines: [{ kind: "text", text: "Overview" }] },
      { kind: "list", isOrdered: false, items: [{ inlines: [{ kind: "text", text: "First" }], blocks: [] }] },
    ])
  })

  it("reads a list as items", () => {
    expect(parseProse("1. First\n2. Second", KNOWN)).toStrictEqual([
      {
        kind: "list",
        isOrdered: true,
        items: [
          { inlines: [{ kind: "text", text: "First" }], blocks: [] },
          { inlines: [{ kind: "text", text: "Second" }], blocks: [] },
        ],
      },
    ])
  })

  it("keeps a list inside an item with that item", () => {
    expect(parseProse("- Outer\n  1. Inner\n- Last", KNOWN)).toStrictEqual([
      {
        kind: "list",
        isOrdered: false,
        items: [
          {
            inlines: [{ kind: "text", text: "Outer" }],
            blocks: [{ kind: "list", isOrdered: true, items: [{ inlines: [{ kind: "text", text: "Inner" }], blocks: [] }] }],
          },
          { inlines: [{ kind: "text", text: "Last" }], blocks: [] },
        ],
      },
    ])
  })

  it("marks italic text, and reads a link to a web address apart from a code link", () => {
    expect(parseInlines("An *open* [question](https://example.com/q).", KNOWN)).toStrictEqual([
      { kind: "text", text: "An " },
      { kind: "emphasis", text: "open" },
      { kind: "text", text: " " },
      { kind: "link", text: "question", href: "https://example.com/q" },
      { kind: "text", text: "." },
    ])
  })

  it("reads a quote with the blocks inside it", () => {
    expect(parseProse("> Said once.\n>\n> - And listed", KNOWN)).toStrictEqual([
      {
        kind: "quote",
        blocks: [
          { kind: "paragraph", inlines: [{ kind: "text", text: "Said once." }] },
          { kind: "list", isOrdered: false, items: [{ inlines: [{ kind: "text", text: "And listed" }], blocks: [] }] },
        ],
      },
    ])
  })

  it("reads a code block with its language, and without one", () => {
    expect(parseProse("```ts\nconst held = 1\n\nreturn held\n```\n\n```\nplain\n```", KNOWN)).toStrictEqual([
      { kind: "code-block", language: "ts", text: "const held = 1\n\nreturn held" },
      { kind: "code-block", language: null, text: "plain" },
    ])
  })
})
