import { parseContextProse, parseInlines, parseProse } from "@/prose/parse-prose"

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

describe("parseContextProse", () => {
  const tabbedContext = [
    "Why it matters.",
    "",
    ":::tabs",
    "::tab What's added",
    "- [`priceOf()`](code:src/price.ts#priceOf): added a new function.",
    "  - Rounds the price.",
    "::tab What's modified",
    "Nothing else.",
    ":::",
    "",
    "After the tabs.",
  ].join("\n")

  it("reads a tabs block as tabs, each with its label and the blocks under it", () => {
    expect(parseContextProse(tabbedContext, KNOWN)).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "text", text: "Why it matters." }] },
      {
        kind: "tabs",
        tabs: [
          {
            label: "What's added",
            blocks: [
              {
                kind: "list",
                isOrdered: false,
                items: [
                  {
                    inlines: [
                      { kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" },
                      { kind: "text", text: ": added a new function." },
                    ],
                    blocks: [{ kind: "list", isOrdered: false, items: [{ inlines: [{ kind: "text", text: "Rounds the price." }], blocks: [] }] }],
                  },
                ],
              },
            ],
          },
          { label: "What's modified", blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Nothing else." }] }] },
        ],
      },
      { kind: "paragraph", inlines: [{ kind: "text", text: "After the tabs." }] },
    ])
  })

  it("reads a tabs block that is never closed as the text it is", () => {
    const unclosed = ":::tabs\n::tab What's added\n- A page."

    expect(parseContextProse(unclosed, KNOWN)).toStrictEqual(parseProse(unclosed, KNOWN))
  })

  it("reads a tabs block without a tab as the text it is", () => {
    const tabless = ":::tabs\nA page.\n:::"

    expect(parseContextProse(tabless, KNOWN)).toStrictEqual(parseProse(tabless, KNOWN))
  })

  it("reads a tabs line inside a tab as text, so tabs never nest", () => {
    const [tabs] = parseContextProse(":::tabs\n::tab Outer\n:::tabs\n:::", KNOWN)

    expect(tabs).toStrictEqual({ kind: "tabs", tabs: [{ label: "Outer", blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: ":::tabs" }] }] }] })
  })

  it("is the only reader that knows tabs: parseProse reads them as text", () => {
    expect(parseProse(tabbedContext, KNOWN).some((block) => block.kind === "tabs")).toBe(false)
  })
})

describe("parseContextProse with an accordion", () => {
  const paragraphOf = (text: string) => ({ kind: "paragraph", inlines: [{ kind: "text", text }] })

  it("reads an accordion block as sections, each with its label and the blocks under it", () => {
    const accordion = "Why.\n\n:::accordion\n::section What's added\nA page.\n::section What's modified\nThe router.\n:::"

    expect(parseContextProse(accordion, KNOWN)).toStrictEqual([
      paragraphOf("Why."),
      {
        kind: "accordion",
        sections: [
          { label: "What's added", blocks: [paragraphOf("A page.")] },
          { label: "What's modified", blocks: [paragraphOf("The router.")] },
        ],
      },
    ])
  })

  it("reads an accordion that is never closed, or has no section, as the text it is", () => {
    const unclosed = ":::accordion\n::section What's added\nA page."
    const sectionless = ":::accordion\nA page.\n:::"

    expect(parseContextProse(unclosed, KNOWN)).toStrictEqual(parseProse(unclosed, KNOWN))
    expect(parseContextProse(sectionless, KNOWN)).toStrictEqual(parseProse(sectionless, KNOWN))
  })

  it("reads an accordion inside a tab, and tabs inside a section, as text", () => {
    const [tabs] = parseContextProse(":::tabs\n::tab Outer\n:::accordion\n:::", KNOWN)
    const [accordion] = parseContextProse(":::accordion\n::section Outer\n:::tabs\n:::", KNOWN)

    expect(tabs).toStrictEqual({ kind: "tabs", tabs: [{ label: "Outer", blocks: [paragraphOf(":::accordion")] }] })
    expect(accordion).toStrictEqual({ kind: "accordion", sections: [{ label: "Outer", blocks: [paragraphOf(":::tabs")] }] })
  })

  it("leaves an accordion as text for parseProse", () => {
    expect(parseProse(":::accordion\n::section A\nB\n:::", KNOWN).some((block) => block.kind === "accordion")).toBe(false)
  })
})
