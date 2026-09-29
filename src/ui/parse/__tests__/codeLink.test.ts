import { describe, expect, test } from "vitest"
import { labelIdentifier, linkKey, parseCodeLinks } from "../../../lib/schemas/document/codeLinks"

/*
 * `[label](code:path#L95-96)`, the one link that points at a file.
 *
 * It exists for a trigger trace, where each step of a numbered list has to say
 * where it is without breaking the sentence to open a fence. A scheme rather
 * than a fragment, because `#slug` already means a waypoint.
 */
describe("parseCodeLinks", () => {
  test("reads a label, a path and a range", () => {
    expect(
      parseCodeLinks("Then [`spanOfRange(range)`](code:src/selectionRange.ts#L75-90) runs."),
    ).toEqual([
      {
        label: "`spanOfRange(range)`",
        path: "src/selectionRange.ts",
        lines: { from: 75, to: 90 },
        symbol: null,
        target: "code:src/selectionRange.ts#L75-90",
        at: 5,
      },
    ])
  })

  test("reads one line, and a whole file", () => {
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L9)")[0]?.lines).toEqual({ from: 9, to: 9 })
    expect(parseCodeLinks("[`f()`](code:src/a.ts)")[0]?.lines).toBeNull()
  })

  test("takes a backwards range the right way round", () => {
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L90-75)")[0]?.lines).toEqual({
      from: 75,
      to: 90,
    })
  })

  test("accepts an `L` on both ends, as a fence range may have", () => {
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L75-L90)")[0]?.lines).toEqual({
      from: 75,
      to: 90,
    })
  })

  /*
   * The target is the href as written, and this is the assertion that was
   * missing.
   *
   * The test above proved `#L75-L90` parsed into the right range and stopped
   * there, so nothing caught that the target was being rebuilt from the parts
   * and losing the second `L`. The popup is looked up by the `href` attribute
   * the Markdown renderer emits, which is the author's own text, so a target
   * that has been normalised is a target nothing will ever match: the link
   * rendered, the hover did nothing, and no error said why.
   *
   * Both spellings are accepted, so both have to key on themselves.
   */
  test("keys on the href as written, whichever spelling of a range it uses", () => {
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L75-L90)")[0]?.target).toBe(
      "code:src/a.ts#L75-L90",
    )
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L75-90)")[0]?.target).toBe(
      "code:src/a.ts#L75-90",
    )
  })

  test("keys a backwards range on what was written, not on what it means", () => {
    // The range is put the right way round for reading the file; the target is
    // not, because the href in the document still says `#L90-75`.
    const [link] = parseCodeLinks("[`f()`](code:src/a.ts#L90-75)")
    expect(link?.lines).toEqual({ from: 75, to: 90 })
    expect(link?.target).toBe("code:src/a.ts#L90-75")
  })

  test("keys a single line and a whole file on themselves too", () => {
    expect(parseCodeLinks("[`f()`](code:src/a.ts#L9)")[0]?.target).toBe("code:src/a.ts#L9")
    expect(parseCodeLinks("[`f()`](code:src/a.ts)")[0]?.target).toBe("code:src/a.ts")
  })

  test("keeps a label that is inline code, which most of them are", () => {
    // The reason code links are matched before inline spans are masked. Masking
    // first blanked the label and left the target, which is the half that reads
    // as working.
    const found = parseCodeLinks("[`addToBasket({ id: 7 })`](code:src/a.ts#L9)")
    expect(found[0]?.label).toBe("`addToBasket({ id: 7 })`")
  })

  /*
   * A label carries raw values, and a value that will not fit is a shape.
   *
   * `[9 ranges]` and `[1…41]` are the labels the format asks for, and a label
   * pattern that stopped at the first `]` matched none of them. The anchor
   * still rendered — markdown-it balances brackets in a link label — so the
   * link looked like a link and had no excerpt behind it, which reads as the
   * hover being broken.
   */
  test("keeps a label that contains brackets, which a raw value often does", () => {
    for (const label of [
      "`annotateRanges(<div.fp-interlude>, [9 ranges])`",
      '`levelsFor("# The customer\u2019s basket…", [1…41])`',
      "`lines[0]`",
    ]) {
      const found = parseCodeLinks(`Then [${label}](code:src/a.ts#L1-9) runs.`)
      expect(found, label).toHaveLength(1)
      expect(found[0]?.label).toBe(label)
    }
  })

  test("still reads two links on one line when a label has brackets", () => {
    const found = parseCodeLinks(
      "[`f([1, 2])`](code:src/a.ts#L1) then [`g([3])`](code:src/b.ts#L2)",
    )
    expect(found.map((link) => link.path)).toEqual(["src/a.ts", "src/b.ts"])
  })

  test("anchors a bracketed label on its identifier", () => {
    expect(labelIdentifier("`annotateRanges(<div>, [9 ranges])`")).toBe("annotateRanges")
  })

  test("ignores a link inside a fenced example", () => {
    const markdown = [
      "Real: [`f()`](code:src/a.ts#L1)",
      "",
      "```markdown",
      "Example: [`g()`](code:src/b.ts#L2)",
      "```",
    ].join("\n")
    expect(parseCodeLinks(markdown).map((link) => link.path)).toEqual(["src/a.ts"])
  })

  test("reads several links in one sentence, in order", () => {
    const found = parseCodeLinks(
      "[Submit](code:src/ui.ts#L95-96) calls [`register()`](code:src/a.ts#L199)",
    )
    expect(found.map((link) => link.path)).toEqual(["src/ui.ts", "src/a.ts"])
  })

  test("is not fooled by an ordinary link or an anchor", () => {
    expect(parseCodeLinks("[a](#slug) and [b](https://example.com) and [c](./x.md)")).toEqual([])
  })
})

/*
 * The label is the anchor, which is what makes these links survive an edit.
 */
describe("labelIdentifier", () => {
  test("takes the identifier out of a call, backticks and arguments included", () => {
    expect(labelIdentifier("`addToBasket({ productId: \"sku-7\" })`")).toBe("addToBasket")
    expect(labelIdentifier("`spanOfRange(range)`")).toBe("spanOfRange")
    expect(labelIdentifier("`MAX_ANIMATED_TOKENS`")).toBe("MAX_ANIMATED_TOKENS")
  })

  test("answers null for a label with no backticks", () => {
    // The first step of a trace names a user action, and "Submit" is not a
    // symbol to go looking for. Backticks are what say a label names code.
    expect(labelIdentifier("Submit Button")).toBeNull()
    expect(labelIdentifier("the submit button")).toBeNull()
    expect(labelIdentifier("  ")).toBeNull()
  })

  test("reads the identifier out of a partly-code label", () => {
    expect(labelIdentifier("the `Submit` button")).toBe("Submit")
  })
})

describe("a code link that names a declaration", () => {
  it("should read the symbol", () => {
    const [link] = parseCodeLinks("It calls [`getUser()`](code:src/auth/user.ts#getUser).")
    expect(link).toMatchObject({
      path: "src/auth/user.ts",
      symbol: "getUser",
      lines: null,
    })
  })

  it("should read a qualified name", () => {
    const [link] = parseCodeLinks("[`check()`](code:src/a.ts#StockService.check)")
    expect(link?.symbol).toBe("StockService.check")
  })

  it("should keep reading the line form", () => {
    // The fallback for what no declaration names.
    const [link] = parseCodeLinks("[9 ranges](code:src/a.ts#L300-320)")
    expect(link).toMatchObject({
      symbol: null,
      lines: { from: 300, to: 320 },
    })
  })

  it("should read a whole-file link", () => {
    const [link] = parseCodeLinks("[the config](code:tsconfig.json)")
    expect(link).toMatchObject({ path: "tsconfig.json", symbol: null, lines: null })
  })

  it("should keep the href exactly as written", () => {
    // It is the key the excerpt is stored under, and the key it is looked up by
    // is the author's own text.
    const [link] = parseCodeLinks("[`f()`](code:src/a.ts#f)")
    expect(link?.target).toBe("code:src/a.ts#f")
  })

  it("should read two links on one line as two", () => {
    const links = parseCodeLinks(
      "[`a()`](code:src/a.ts#a) calls [`b()`](code:src/b.ts#b).",
    )
    expect(links.map((l) => l.symbol)).toEqual(["a", "b"])
  })

  /*
   * A bare destination ends at the first `)`, which rules out a great many real
   * paths: every route group, every dynamic segment. Markdown's answer
   * is the pointy brackets, and until they were read here a repository written
   * that way had links that were silently not links — every hover did nothing,
   * and nothing anywhere said why.
   */
  it("should read a pointy-bracket destination", () => {
    const [link] = parseCodeLinks("[`Button`](<code:app/(shop)/page.tsx#Button>)")
    expect(link).toMatchObject({
      path: "app/(shop)/page.tsx",
      symbol: "Button",
      lines: null,
    })
  })

  it("should read a path holding brackets and parentheses at once", () => {
    const [link] = parseCodeLinks(
      "[`Form`](<code:app/(checkout)/orders/[orderId]/Form.tsx#Form>)",
    )
    expect(link).toMatchObject({
      path: "app/(checkout)/orders/[orderId]/Form.tsx",
      symbol: "Form",
    })
  })

  it("should leave the pointy brackets out of the target", () => {
    // They are Markdown's punctuation, and the renderer does not put them in
    // the `href` either — so a target carrying them would match nothing.
    const [link] = parseCodeLinks("[`f()`](<code:src/a.ts#f>)")
    expect(link?.target).toBe("code:src/a.ts#f")
  })

  it("should read the line form inside pointy brackets", () => {
    const [link] = parseCodeLinks("[9 ranges](<code:app/(shop)/a.ts#L300-320>)")
    expect(link).toMatchObject({
      path: "app/(shop)/a.ts",
      lines: { from: 300, to: 320 },
      symbol: null,
    })
  })

  it("should read both forms in one paragraph", () => {
    const links = parseCodeLinks(
      "[`a()`](code:src/a.ts#a) and [`b()`](<code:app/(shop)/b.ts#b>).",
    )
    expect(links.map((l) => l.path)).toEqual(["src/a.ts", "app/(shop)/b.ts"])
  })
})

/*
 * The two strings that have to be one string.
 *
 * An excerpt is stored under the target its author wrote and looked up by the
 * `href` the Markdown renderer emitted. A destination is a URL, so those differ
 * the moment a path holds a bracket, and every such link missed its excerpt.
 */
describe("linkKey", () => {
  it("should match an encoded href to the target it was written as", () => {
    const written = "code:app/orders/[orderId]/page.tsx#Page"
    const href = "code:app/orders/%5BorderId%5D/page.tsx#Page"
    expect(linkKey(href)).toBe(linkKey(written))
  })

  it("should leave a plain target alone", () => {
    expect(linkKey("code:src/a.ts#L10-20")).toBe("code:src/a.ts#L10-20")
  })

  it("should not decode an escaped hash, which would split the target", () => {
    expect(linkKey("code:src/a%23b.ts#f")).toBe("code:src/a%23b.ts#f")
  })

  it("should hand back a malformed escape untouched", () => {
    // Somebody's path, not this function's business to repair.
    expect(linkKey("code:src/100%.ts#f")).toBe("code:src/100%.ts#f")
  })
})
