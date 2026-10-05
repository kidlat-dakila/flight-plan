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

  it("reads a list as items", () => {
    expect(parseProse("1. First\n2. Second", KNOWN)).toStrictEqual([
      {
        kind: "list",
        isOrdered: true,
        items: [[{ kind: "text", text: "First" }], [{ kind: "text", text: "Second" }]],
      },
    ])
  })
})
