import { buildLinesCodeLink, formatCodeLink, parseCodeLink } from "@/lib/code-link-node"

describe("parseCodeLink", () => {
  it("reads a code link at the start of the text, with what it points at and whether its label is code", () => {
    expect(parseCodeLink("[`priceOf`](code:src/price.ts#priceOf) and more")).toStrictEqual({
      raw: "[`priceOf`](code:src/price.ts#priceOf)",
      label: "priceOf",
      linkId: "src/price.ts#priceOf",
      isCode: true,
    })
    expect(parseCodeLink("[the cart total](code:src/cart.ts#L3-L5)")).toMatchObject({ label: "the cart total", isCode: false })
  })

  it("reads a path with the parentheses of a Next.js route group", () => {
    expect(parseCodeLink("[the shop page](code:app/(shop)/[id]/page.tsx#L1-3) and more")).toStrictEqual({
      raw: "[the shop page](code:app/(shop)/[id]/page.tsx#L1-3)",
      label: "the shop page",
      linkId: "app/(shop)/[id]/page.tsx#L1-3",
      isCode: false,
    })
  })

  it("reads nothing from a link to a web address or from text that only contains a code link later", () => {
    expect(parseCodeLink("[docs](https://example.com)")).toBeNull()
    expect(parseCodeLink("See [`priceOf`](code:src/price.ts#priceOf)")).toBeNull()
  })
})

describe("formatCodeLink", () => {
  it("writes a code link the way it is read", () => {
    const written = "[`priceOf`](code:src/price.ts#priceOf)"

    expect(formatCodeLink({ label: "priceOf", linkId: "src/price.ts#priceOf", isCode: true })).toBe(written)
    expect(parseCodeLink(written)).toMatchObject({ raw: written })
    expect(formatCodeLink({ label: "the cart total", linkId: "src/cart.ts#L3-L5", isCode: false })).toBe(
      "[the cart total](code:src/cart.ts#L3-L5)",
    )
  })
})

describe("buildLinesCodeLink", () => {
  const link = { path: "src/cart.ts", range: { lineStart: 3, lineEnd: 5 }, label: " the cart total ", isCode: false }

  it("points at the lines of the file, by one line or by the first and the last", () => {
    expect(buildLinesCodeLink(link)).toStrictEqual({ linkId: "src/cart.ts#L3-5", label: "the cart total", isCode: false })
    expect(buildLinesCodeLink({ ...link, range: { lineStart: 3, lineEnd: 3 }, isCode: true })).toStrictEqual({
      linkId: "src/cart.ts#L3",
      label: "the cart total",
      isCode: true,
    })
  })

  it("builds a link that is read back as it was written", () => {
    const codeLink = buildLinesCodeLink(link)

    expect(codeLink === null ? null : parseCodeLink(formatCodeLink(codeLink))).toMatchObject({ linkId: "src/cart.ts#L3-5", label: "the cart total" })
  })

  it("builds nothing from a label or a path that a code link cannot be written with", () => {
    expect(buildLinesCodeLink({ ...link, label: "  " })).toBeNull()
    expect(buildLinesCodeLink({ ...link, label: "total] of" })).toBeNull()
    expect(buildLinesCodeLink({ ...link, label: "`total`" })).toBeNull()
    expect(buildLinesCodeLink({ ...link, path: "src/my cart.ts" })).toBeNull()
    expect(buildLinesCodeLink({ ...link, path: "src/cart(old).ts" })).toBeNull()
  })
})
