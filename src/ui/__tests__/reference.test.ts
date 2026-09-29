import {
  buildAnnotationReference,
  buildFileReference,
} from "../reference"

describe("reference: files", () => {
  describe("buildFileReference", () => {
    it("should name the path and a span", () => {
      expect(
        buildFileReference({ path: "src/repo.ts", from: 26, to: 34 }),
      ).toBe("src/repo.ts#L26-34")
    })

    it("should collapse a single line", () => {
      expect(buildFileReference({ path: "src/repo.ts", from: 26, to: 26 })).toBe(
        "src/repo.ts#L26",
      )
    })

    it("should order a reversed selection", () => {
      expect(buildFileReference({ path: "a.ts", from: 34, to: 26 })).toBe(
        "a.ts#L26-34",
      )
    })

    it("should not name an MCP tool", () => {
      expect(buildFileReference({ path: "a.ts", from: 1, to: 2 })).not.toContain(
        "mcp:",
      )
    })
  })
})

describe("reference: qualification", () => {
  const at = { repo: "o/r", sha: "9b8ab31000000000000000000000000000000000" }

  describe("buildFileReference", () => {
    it("should leave a path bare when the reader has the file", () => {
      expect(buildFileReference({ path: "src/repo.ts", from: 19, to: 34 })).toBe(
        "src/repo.ts#L19-34",
      )
    })

    it("should name the repository and commit when the reader does not", () => {
      // The walkthrough's own reference form, so an assistant with no checkout
      // fetches the bytes the walkthrough means rather than what is on disk.
      expect(
        buildFileReference({ path: "src/repo.ts", from: 19, to: 34, at }),
      ).toBe(`o/r@${at.sha}:src/repo.ts#L19-34`)
    })

    it("should collapse a single line when qualified", () => {
      expect(buildFileReference({ path: "a.ts", from: 33, to: 33, at })).toBe(
        `o/r@${at.sha}:a.ts#L33`,
      )
    })

    it("should order a reversed selection before qualifying it", () => {
      expect(buildFileReference({ path: "a.ts", from: 34, to: 19, at })).toBe(
        `o/r@${at.sha}:a.ts#L19-34`,
      )
    })

    it("should treat a null qualification as no qualification", () => {
      expect(buildFileReference({ path: "a.ts", from: 1, to: 2, at: null })).toBe(
        "a.ts#L1-2",
      )
    })
  })
})


describe("buildAnnotationReference", () => {
  const base = {
    subject: "review:acme/storefront#412",
    node: "stock-guard",
    text: "the whole set to levelsFor()",
    toolHint: "read",
  }

  it("should name the waypoint and quote the selection", () => {
    expect(buildAnnotationReference(base)).toBe(
      '[mcp:read] review:acme/storefront#412@stock-guard "the whole set to levelsFor()"',
    )
  })

  it("should name the document alone for prose outside any waypoint", () => {
    // The context section and the overview belong to no waypoint. Inventing
    // one would point the assistant at a card that does not contain the text.
    expect(buildAnnotationReference({ ...base, node: null })).toBe(
      '[mcp:read] review:acme/storefront#412 "the whole set to levelsFor()"',
    )
  })

  it("should collapse the whitespace a selection drags in", () => {
    // A selection spanning a line break carries the newline and the indent of
    // the next line, and a quote nobody can match is worse than no quote.
    expect(
      buildAnnotationReference({ ...base, text: "  one\n\n   two  " }),
    ).toContain('"one two"')
  })

  it("should cut a selection long enough to stop being a quote", () => {
    const long = "word ".repeat(60)
    const built = buildAnnotationReference({ ...base, text: long })
    expect(built.length).toBeLessThan(200)
    expect(built).toContain("…")
  })

  it("should carry no quote when the selection is only whitespace", () => {
    expect(buildAnnotationReference({ ...base, text: "   \n  " })).toBe(
      "[mcp:read] review:acme/storefront#412@stock-guard",
    )
  })

  it("should omit the tool hint when there is none", () => {
    expect(buildAnnotationReference({ ...base, toolHint: "" })).toBe(
      'review:acme/storefront#412@stock-guard "the whole set to levelsFor()"',
    )
  })

  it("should not put a line number anywhere in it", () => {
    // The whole point. A JSON document's prose has no lines, and a reference
    // by line pointed at nothing while looking like one that pointed at
    // something.
    expect(buildAnnotationReference(base)).not.toMatch(/@L\d/)
  })
})
