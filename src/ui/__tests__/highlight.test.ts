import {
  MAX_WHOLE_FILE_LINES,
  WINDOW_CONTEXT,
  chooseWindow,
  fileLines,
  highlightReference,
  languageOfPath,
} from "../highlight"

describe("highlight", () => {
  const numbered = (count: number) =>
    Array.from({ length: count }, (_value, index) => `line ${index + 1}`).join("\n")

  describe("fileLines", () => {
    it("should not count a trailing newline as a line", () => {
      expect(fileLines("a\nb\n")).toEqual(["a", "b"])
    })

    it("should keep a deliberate blank last line", () => {
      expect(fileLines("a\nb\n\n")).toEqual(["a", "b", ""])
    })

    it("should normalise carriage returns", () => {
      expect(fileLines("a\r\nb\r\n")).toEqual(["a", "b"])
    })

    it("should treat an empty file as one empty line", () => {
      expect(fileLines("")).toEqual([""])
    })
  })

  describe("chooseWindow", () => {
    it("should show a short file whole", () => {
      expect(chooseWindow(40, { from: 10, to: 12 })).toEqual({ from: 1, to: 40 })
    })

    it("should show a short file whole when nothing is focused", () => {
      expect(chooseWindow(40, null)).toEqual({ from: 1, to: 40 })
    })

    it("should window a long file around the focus", () => {
      const total = MAX_WHOLE_FILE_LINES + 500
      expect(chooseWindow(total, { from: 900, to: 910 })).toEqual({
        from: 900 - WINDOW_CONTEXT,
        to: 910 + WINDOW_CONTEXT,
      })
    })

    it("should not run off the start of a long file", () => {
      expect(chooseWindow(5000, { from: 3, to: 4 }).from).toBe(1)
    })

    it("should not run off the end of a long file", () => {
      expect(chooseWindow(5000, { from: 4990, to: 5000 }).to).toBe(5000)
    })

    it("should show the head of a long file with no focus", () => {
      expect(chooseWindow(5000, null)).toEqual({
        from: 1,
        to: MAX_WHOLE_FILE_LINES,
      })
    })
  })

  describe("languageOfPath", () => {
    it("should read a known extension", () => {
      expect(languageOfPath("src/panel.ts")).toBe("ts")
    })

    it("should fall back to plain text for an unknown extension", () => {
      expect(languageOfPath("LICENSE.unknown")).toBe("txt")
    })

    it("should fall back to plain text for a file with no extension", () => {
      expect(languageOfPath("Makefile")).toBe("txt")
    })
  })

  /** The line span of one kind of annotation, which is all these assert on. */
  const bands = (resolved: { code: { annotations: readonly unknown[] } }) => {
    const spans = resolved.code.annotations as {
      name: string
      fromLineNumber?: number
      toLineNumber?: number
    }[]
    return (name: string) => {
      const found = spans.find((span) => span.name === name)
      if (found?.fromLineNumber === undefined || found.toLineNumber === undefined) {
        throw new Error(`no ${name} annotation`)
      }
      return { from: found.fromLineNumber, to: found.toLineNumber }
    }
  }

  describe("highlightReference", () => {
    it("should render the whole of a short file", async () => {
      const resolved = await highlightReference(
        { path: "a.ts", focus: { from: 2, to: 3 } },
        [],
        numbered(5),
        "ts",
        "github-dark",
      )
      expect(resolved.startLine).toBe(1)
      expect(resolved.windowed).toBe(false)
      expect(resolved.code.code.split("\n")).toHaveLength(5)
    })

    it("should focus the referenced lines", async () => {
      const resolved = await highlightReference(
        { path: "a.ts", focus: { from: 2, to: 3 } },
        [],
        numbered(5),
        "ts",
        "github-dark",
      )
      expect(resolved.code.annotations).toContainEqual({
        name: "focus",
        query: "",
        fromLineNumber: 2,
        toLineNumber: 3,
      })
    })

    it("should mark the lines the fence named", async () => {
      const resolved = await highlightReference(
        { path: "a.ts", focus: null },
        [{ from: 4, to: 4 }],
        numbered(5),
        "ts",
        "github-dark",
      )
      expect(resolved.code.annotations).toContainEqual({
        name: "mark",
        query: "",
        fromLineNumber: 4,
        toLineNumber: 4,
      })
    })

    /*
     * The marks travel with the range they are inside.
     *
     * Reported against a pull request, where it is visible: the focus and the
     * diff bands are both computed from the file as it is now and agreed with
     * each other, while the marks stayed at the lines the author wrote and sat
     * a few lines off from both.
     */
    describe("when the anchor repairs the range", () => {
      /** The same file with three lines inserted above the referenced range. */
      const moved = ["x", "x", "x", numbered(40)].join("\n")

      const resolve = () =>
        highlightReference(
          { path: "a.ts", focus: { from: 10, to: 20 } },
          [{ from: 12, to: 14 }],
          moved,
          "ts",
          "github-dark",
          [{ from: 13, to: 23 }],
          "line 10",
        )

      it("should move the marks by the same amount as the range", async () => {
        const resolved = await resolve()
        expect(resolved.shifted).toBe(3)
        expect(resolved.code.annotations).toContainEqual({
          name: "mark",
          query: "",
          fromLineNumber: 15,
          toLineNumber: 17,
        })
      })

      it("should keep the marks inside the focus they were written about", async () => {
        const band = bands(await resolve())
        expect(band("mark").from).toBeGreaterThanOrEqual(band("focus").from)
        expect(band("mark").to).toBeLessThanOrEqual(band("focus").to)
      })

      it("should agree with the diff, which is read from the same file", async () => {
        const band = bands(await resolve())
        expect(band("mark").from).toBeGreaterThanOrEqual(band("diff").from)
        expect(band("mark").to).toBeLessThanOrEqual(band("diff").to)
      })
    })

    it("should leave the marks alone when the anchor is lost", async () => {
      // Nothing was repaired, so there is nothing to shift them by: the range
      // and its marks stay exactly where they were written.
      const resolved = await highlightReference(
        { path: "a.ts", focus: { from: 10, to: 20 } },
        [{ from: 12, to: 14 }],
        numbered(40),
        "ts",
        "github-dark",
        [],
        "a line that is not in this file",
      )
      expect(resolved.anchor).toBe("lost")
      expect(resolved.code.annotations).toContainEqual({
        name: "mark",
        query: "",
        fromLineNumber: 12,
        toLineNumber: 14,
      })
    })

    it("should translate annotations into the window's own numbering", async () => {
      const focus = { from: 900, to: 902 }
      const resolved = await highlightReference(
        { path: "a.ts", focus },
        [{ from: 905, to: 905 }],
        numbered(MAX_WHOLE_FILE_LINES + 500),
        "ts",
        "github-dark",
      )
      expect(resolved.startLine).toBe(900 - WINDOW_CONTEXT)
      expect(resolved.windowed).toBe(true)
      expect(resolved.code.annotations).toContainEqual({
        name: "focus",
        query: "",
        fromLineNumber: WINDOW_CONTEXT + 1,
        toLineNumber: WINDOW_CONTEXT + 3,
      })
      expect(resolved.code.annotations).toContainEqual({
        name: "mark",
        query: "",
        fromLineNumber: WINDOW_CONTEXT + 6,
        toLineNumber: WINDOW_CONTEXT + 6,
      })
    })

    it("should drop a mark that falls outside the window", async () => {
      const resolved = await highlightReference(
        { path: "a.ts", focus: { from: 900, to: 902 } },
        [{ from: 10, to: 12 }],
        numbered(MAX_WHOLE_FILE_LINES + 500),
        "ts",
        "github-dark",
      )
      expect(resolved.code.annotations.some((a) => a.name === "mark")).toBe(false)
    })

    it("should not strip annotation comments the file happens to contain", async () => {
      const text = ["const a = 1", "// !mark", "const b = 2"].join("\n")
      const resolved = await highlightReference(
        { path: "a.ts", focus: null },
        [],
        text,
        "ts",
        "github-dark",
      )
      // Byte-identical, because deleting a line would shift every line below
      // it and silently invalidate the reference's own numbering.
      expect(resolved.code.code).toBe(text)
      expect(resolved.code.annotations).toEqual([])
    })

    it("should label the block with the path", async () => {
      const resolved = await highlightReference(
        { path: "src/panel.ts", focus: null },
        [],
        numbered(3),
        "ts",
        "github-dark",
      )
      expect(resolved.code.meta).toBe("src/panel.ts")
    })

    it("should fall back to the path's language when the fence names none", async () => {
      const resolved = await highlightReference(
        { path: "src/panel.ts", focus: null },
        [],
        numbered(3),
        "",
        "github-dark",
      )
      expect(resolved.code.lang).toBe("typescript")
    })
  })
})

/*
 * The colour a mark is drawn in, which a finding decides.
 *
 * Code Hike's `mark` annotation carries its colour in the query, and the
 * handler reads it into `--fp-mark-color`. The highlighter is handed a fence
 * and knows nothing about the document, so the colour arrives as an argument:
 * the finding's badge decides it, and its own cards inherit it.
 */
describe("mark colour", () => {
  const file = ["one", "two", "three", "four"].join("\n")
  const ref = { path: "a.ts", focus: { from: 1, to: 4 } }

  test("carries the colour it was given", async () => {
    const resolved = await highlightReference(
      ref,
      [{ from: 2, to: 3 }],
      file,
      "ts",
      "github-dark",
      [],
      null,
      "var(--fp-red)",
    )
    const marks = resolved.code.annotations.filter((a) => a.name === "mark")
    expect(marks).toHaveLength(1)
    expect(marks[0]?.query).toBe("var(--fp-red)")
  })

  test("leaves the query empty for a waypoint that is not a finding", async () => {
    // Empty is what the handler reads as "use the accent", which is what every
    // mark in a tour has always been.
    const resolved = await highlightReference(ref, [{ from: 2, to: 3 }], file, "ts", "github-dark")
    expect(resolved.code.annotations.find((a) => a.name === "mark")?.query).toBe("")
  })
})

describe("the lines a change deleted", () => {
  const file = ["one", "two", "three", "four", "five"].join("\n")
  const ref = { path: "a.ts", focus: { from: 1, to: 5 } }

  const at = async (removed: { after: number; lines: string[] }[]) =>
    await highlightReference(ref, [], file, "ts", "github-dark", [], null, undefined, [], removed)

  it("should splice a removed block in after the line it followed", async () => {
    const out = await at([{ after: 2, lines: ["gone one", "gone two"] }])
    expect(out.code.code.split("\n")).toEqual([
      "one",
      "two",
      "gone one",
      "gone two",
      "three",
      "four",
      "five",
    ])
  })

  it("should give the removed lines no file number", async () => {
    // What lets the gutter leave them blank. Numbering them would claim they
    // are in the file, which is the one thing they are not.
    const out = await at([{ after: 2, lines: ["gone"] }])
    expect(out.numbers).toEqual([1, 2, null, 3, 4, 5])
  })

  it("should mark them as removed", async () => {
    const out = await at([{ after: 2, lines: ["gone one", "gone two"] }])
    const minus = out.code.annotations.filter(
      (a) => a.name === "diff" && a.query === "-",
    )
    expect(minus).toHaveLength(1)
    expect(minus[0]).toMatchObject({ fromLineNumber: 3, toLineNumber: 4 })
  })

  it("should place a block removed from the top before the first line", async () => {
    const out = await at([{ after: 0, lines: ["gone"] }])
    expect(out.code.code.split("\n")[0]).toBe("gone")
    expect(out.numbers?.[0]).toBeNull()
  })

  it("should push the ranges after it further down the panel", async () => {
    // The reason the mapping had to stop being arithmetic: a spliced line
    // moves everything below it, and the focus, the marks and the diff bands
    // all have to move with it or they annotate the wrong lines.
    const out = await highlightReference(
      { path: "a.ts", focus: { from: 4, to: 5 } },
      [{ from: 4, to: 4 }],
      file,
      "ts",
      "github-dark",
      [{ from: 5, to: 5 }],
      null,
      undefined,
      [],
      [{ after: 2, lines: ["gone"] }],
    )
    // File line 4 is panel line 5 once one line is spliced in above it.
    expect(
      out.code.annotations.find((a) => a.name === "focus"),
    ).toMatchObject({ fromLineNumber: 5, toLineNumber: 6 })
    expect(out.code.annotations.find((a) => a.name === "mark")).toMatchObject({
      fromLineNumber: 5,
      toLineNumber: 5,
    })
    expect(
      out.code.annotations.find((a) => a.name === "diff" && a.query === "+"),
    ).toMatchObject({ fromLineNumber: 6, toLineNumber: 6 })
  })

  it("should carry no numbers when nothing was removed", async () => {
    // The unchanged path: a panel whose lines run consecutively from one file
    // line is fully described by `startLine`, and handing back an array would
    // make every caller choose between two descriptions of the same thing.
    const out = await at([])
    expect(out.numbers).toBeUndefined()
  })

  it("should ignore a removal outside the window it is showing", async () => {
    const long = Array.from({ length: 1200 }, (_v, i) => `line ${String(i + 1)}`).join("\n")
    const out = await highlightReference(
      { path: "a.ts", focus: { from: 600, to: 610 } },
      [],
      long,
      "ts",
      "github-dark",
      [],
      null,
      undefined,
      [],
      [{ after: 3, lines: ["gone"] }],
    )
    expect(out.code.code).not.toContain("gone")
    expect(out.numbers).toBeUndefined()
  })
})
