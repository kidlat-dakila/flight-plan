import * as assert from "assert"
import type { SymbolSpan } from "../../../lib/codegraph/symbols/spans"
import { sectionsFrom } from "../walkthroughOf"

/**
 * A file section per changed file, and the waypoints under it.
 *
 * The walkthrough follows the *change*, where the diagram follows the
 * execution. So everything the branch touched appears here, including the
 * constant and the JSON file that will never be a node.
 *
 * The parent/child rule is mechanical and fixed: a body with one changed block
 * is a flat waypoint, and a body with more is a parent and one child per block.
 * The schema already refuses a waypoint with exactly one child, so this has to
 * implement the rule rather than discover it.
 */

const span = (
  name: string,
  from: number,
  to: number,
  kind: SymbolSpan["kind"] = "callable",
  column = 1,
): SymbolSpan => ({
  name,
  from,
  to,
  kind,
  nameAt: { line: from, column },
})

suite("waypoints for one file", () => {
  test("gives a changed declaration one flat waypoint when one block changed", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 12, to: 14 }],
        symbols: [span("priceOf", 10, 20)],
      },
    ])

    assert.strictEqual(section?.path, "src/a.ts")
    assert.strictEqual(section.waypoints.length, 1)
    const only = section.waypoints[0]
    assert.deepStrictEqual(only?.code.target, { symbol: "priceOf" })
    assert.deepStrictEqual(only?.code.covers, [0])
    // No children, and that is the rule rather than an omission: the parent's
    // range *is* the block, so a child would highlight its whole focus.
    assert.strictEqual(only?.children, undefined)
  })

  test("keeps two hunks in one body as two cards, because a hunk is the unit", () => {
    /*
     * The rule the scaffold used to apply was the opposite: one card per
     * declaration, with a child per hunk under it. A reader looks at a block of
     * changed lines, so the block is what a card explains.
     */
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [
          { from: 12, to: 13 },
          { from: 17, to: 18 },
        ],
        symbols: [span("priceOf", 10, 20)],
      },
    ])

    assert.strictEqual(section?.waypoints.length, 2)
    assert.deepStrictEqual(section.waypoints[0]?.code.target, { symbol: "priceOf" })
    assert.deepStrictEqual(section.waypoints[0]?.code.covers, [0])
    assert.deepStrictEqual(section.waypoints[1]?.code.target, { symbol: "priceOf" })
    assert.deepStrictEqual(section.waypoints[1]?.code.covers, [1])
    assert.strictEqual(section.waypoints[0]?.children, undefined)
    assert.strictEqual(section.waypoints[1]?.children, undefined)
  })

  test("gives one hunk one card however many declarations it holds", () => {
    /*
     * The case this rule was written for. Three constants added side by side
     * are one block of changed lines, and they used to arrive as three cards
     * stacked above it, each explaining a third of what the reader sees.
     */
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 34, to: 43 }],
        symbols: [
          span("DEFAULT_SCHEDULE_FILTERS", 34, 36, "other"),
          span("SCHEDULE_FILTER_NONE", 41, 41, "other"),
          span("STATUS_FILTER_NONE", 42, 42, "other"),
        ],
      },
    ])

    assert.strictEqual(section?.waypoints.length, 1)
    assert.deepStrictEqual(section.waypoints[0]?.code.covers, [0])
  })

  test("falls back to the lines when a group has no single owner to name", () => {
    // Two declarations in one group, so neither name is the card's name.
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 34, to: 43 }],
        symbols: [span("first", 34, 36, "other"), span("second", 41, 42, "other")],
      },
    ])

    assert.deepStrictEqual(section?.waypoints[0]?.code.target, {
      focus: { from: 34, to: 43 },
    })
    assert.strictEqual(section?.waypoints[0]?.title, "first, second")
  })

  test("counts the rest once a group holds more names than a title can list", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 1, to: 10 }],
        symbols: [
          span("a", 1, 1, "other"),
          span("b", 2, 2, "other"),
          span("c", 3, 3, "other"),
          span("d", 4, 4, "other"),
          span("e", 5, 5, "other"),
        ],
      },
    ])

    assert.strictEqual(section?.waypoints[0]?.title, "a, b, c +2 more")
  })

  test("points each waypoint at the one hunk it explains, by index", () => {
    // `covers` indexes the file's added hunks in file order. The resolver turns
    // those into marks, so the author says which *change* rather than which
    // lines and the two cannot disagree. One card, one hunk, one index.
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [
          { from: 3, to: 3 },
          { from: 12, to: 13 },
          { from: 17, to: 18 },
        ],
        symbols: [span("priceOf", 10, 20)],
      },
    ])

    assert.deepStrictEqual(
      section?.waypoints.map((point) => point.code.covers),
      [[0], [1], [2]],
    )
  })

  test("takes the innermost declaration a change fell in", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 12, to: 13 }],
        symbols: [span("StockService", 1, 40, "container"), span("StockService.check", 10, 20)],
      },
    ])

    assert.deepStrictEqual(section?.waypoints[0]?.code.target, {
      symbol: "StockService.check",
    })
  })

  test("does not lose a change that fell outside every declaration", () => {
    /*
     * A changed import, a changed constant in a file the parser gives no
     * symbol for, a reordered header. The diagram is allowed to ignore these —
     * it follows the execution — but the walkthrough follows the change, and a
     * change with no waypoint is a change the document does not mention.
     *
     * Addressed by lines rather than by name, because there is no name.
     */
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 1, to: 2 }],
        symbols: [span("priceOf", 10, 20)],
      },
    ])

    assert.strictEqual(section?.waypoints.length, 1)
    assert.deepStrictEqual(section.waypoints[0]?.code.target, { focus: { from: 1, to: 2 } })
    assert.deepStrictEqual(section.waypoints[0]?.code.covers, [0])
  })

  test("writes a section for a file nothing could parse", () => {
    // No language server, or a file no parser answers for. The section is from
    // the diff alone, which is less than a scaffold and more than nothing.
    const [section] = sectionsFrom([
      {
        path: "config/settings.json",
        added: [{ from: 4, to: 6 }],
        symbols: undefined,
      },
    ])

    assert.strictEqual(section?.path, "config/settings.json")
    assert.deepStrictEqual(section.waypoints[0]?.code.target, { focus: { from: 4, to: 6 } })
    assert.strictEqual(section.waypoints[0]?.code.lang, "json")
  })

  test("leaves every piece of prose unwritten, and says so in one way", () => {
    // One marker, so the completeness check has one thing to refuse. An agent
    // that skipped a card cannot have the document pass by leaving the card
    // looking plausible.
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [
          { from: 12, to: 13 },
          { from: 17, to: 18 },
        ],
        symbols: [span("priceOf", 10, 20)],
      },
    ])

    assert.strictEqual(section?.waypoints.length, 2)
    for (const point of section.waypoints) assert.strictEqual(point.reading, null)
    assert.deepStrictEqual(section.summary, [])
  })

  test("gives every waypoint an id of its own, across files", () => {
    const sections = sectionsFrom([
      { path: "src/a.ts", added: [{ from: 12, to: 13 }], symbols: [span("one", 10, 20)] },
      { path: "src/b.ts", added: [{ from: 12, to: 13 }], symbols: [span("two", 10, 20)] },
    ])

    const ids = sections.flatMap((section) =>
      section.waypoints.flatMap((point) => [
        point.id,
        ...(point.children ?? []).map((kid) => kid.id),
      ]),
    )
    assert.strictEqual(new Set(ids).size, ids.length, `ids repeat: ${ids.join(", ")}`)
  })

  test("names the language from the file, for the fence", () => {
    const sections = sectionsFrom([
      { path: "a.ts", added: [{ from: 1, to: 1 }], symbols: undefined },
      { path: "b.py", added: [{ from: 1, to: 1 }], symbols: undefined },
      { path: "c.rb", added: [{ from: 1, to: 1 }], symbols: undefined },
      { path: "Makefile", added: [{ from: 1, to: 1 }], symbols: undefined },
    ])

    assert.deepStrictEqual(
      sections.map((section) => section.waypoints[0]?.code.lang),
      ["ts", "py", "rb", "text"],
    )
  })

  test("writes no section for a file with nothing added", () => {
    // A pure deletion has no head-side lines to point at. It belongs in the
    // implementation list rather than as a waypoint addressing nothing.
    assert.deepStrictEqual(
      sectionsFrom([{ path: "src/gone.ts", added: [], symbols: undefined }]),
      [],
    )
  })
})

suite("what the checker refuses", () => {
  test("is an empty reading rather than a string that stands for one", async () => {
    /*
     * There used to be a sentinel here, and two copies of it — the scaffold
     * wrote one and the completeness check refused the other, in different
     * bundles, held in step by this test. `null` needs no such pact: it is the
     * schema's own empty value, so the two cannot drift and the failure this
     * guarded against is unrepresentable rather than tested for.
     *
     * What is still worth checking is that the gate reads the empty value as
     * work outstanding, because that is the bargain the scaffold makes.
     */
    const { worklistOf } = await import("../../utils/document/worklist")
    const section = sectionsFrom([
      { path: "src/a.ts", added: [{ from: 12, to: 13 }], symbols: [span("priceOf", 10, 20)] },
    ])
    assert.strictEqual(section[0]?.waypoints[0]?.reading, null)

    const work = worklistOf(
      {
        meta: { kind: "walkthrough" },
        contextBody: { context: "c", overview: [], implementation: [] },
        codeWalkthrough: { files: section },
        diagram: null,
      } as never,
      "walkthrough",
    )
    assert.ok(work.some((one) => one.needs === "reading" && one.id === "w1"))
  })
})

suite("the order a section reads in", () => {
  /*
   * A tour reads top to bottom, and `check.ts` refuses a document whose marks
   * go backwards within a file. The section used to be built in two passes —
   * the declarations, then everything they did not account for — so a changed
   * import at the top of the file was appended *after* a function reaching line
   * 20, and the document was refused when it was stored.
   */
  test("puts a changed import before the function below it", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [
          // An import at the top, outside every declaration.
          { from: 4, to: 4 },
          // And a change inside a function further down.
          { from: 22, to: 22 },
        ],
        symbols: [span("priceOf", 20, 30)],
      },
    ])

    assert.deepStrictEqual(
      section?.waypoints.map((point) => point.title),
      ["Lines 4–4", "priceOf"],
    )
  })

  test("never lets a waypoint's first covered line go backwards", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [
          { from: 40, to: 40 },
          { from: 3, to: 3 },
          { from: 21, to: 21 },
        ],
        symbols: [span("second", 38, 44), span("first", 20, 30)],
      },
    ])

    const added = [
      { from: 40, to: 40 },
      { from: 3, to: 3 },
      { from: 21, to: 21 },
    ]
    let lowest = 0
    for (const point of section?.waypoints ?? []) {
      const first = Math.min(
        ...(point.code.covers ?? []).map((index) => added[index]?.from ?? 0),
      )
      assert.ok(first >= lowest, `waypoint "${point.title}" starts at ${String(first)}, after ${String(lowest)}`)
      lowest = Math.max(lowest, first)
    }
  })
})

suite("hunks the diff cut apart", () => {
  /*
   * `priceOf` spans 3–15, and the diff cut the change in it into three.
   *
   * An earlier scaffold put the first two back together, because they sat
   * inside one construct and a diff cuts on unchanged lines rather than on
   * code. That is still true of diffs and is no longer what this does: the
   * unit is the block of changed lines the reader is looking at, and a
   * structure derived from anything else has to be explained before it can be
   * used.
   */
  const file = {
    path: "src/a.ts",
    added: [
      { from: 7, to: 7 },
      { from: 9, to: 9 },
      { from: 13, to: 13 },
    ],
    symbols: [span("priceOf", 3, 15)],
  }

  test("leaves them apart, one card each", () => {
    const [section] = sectionsFrom([file])

    assert.strictEqual(section?.waypoints.length, 3)
    assert.deepStrictEqual(
      section.waypoints.map((point) => point.code.covers),
      [[0], [1], [2]],
    )
  })

  test("still names the declaration each one fell in", () => {
    // One owner, so the card can be anchored to a name that survives the file
    // moving underneath the document.
    const [section] = sectionsFrom([file])

    for (const point of section?.waypoints ?? []) {
      assert.deepStrictEqual(point.code.target, { symbol: "priceOf" })
    }
  })

  test("gives no waypoint children at all", () => {
    // The schema still allows them and an agent may still write them. Nothing
    // derived produces them any more.
    const [section] = sectionsFrom([file])
    for (const point of section?.waypoints ?? []) {
      assert.strictEqual(point.children, undefined)
    }
  })
})

suite("a file that did not exist before", () => {
  /*
   * The one exception. A created file is a single hunk however long it is, so
   * the rule on its own would give a four-hundred-line file one card.
   */
  const created = {
    path: "src/new.ts",
    added: [{ from: 1, to: 30 }],
    symbols: [span("first", 5, 12), span("second", 14, 30)],
    created: true as const,
  }

  test("cuts it at its declarations rather than leaving one card", () => {
    const [section] = sectionsFrom([created])

    assert.deepStrictEqual(
      section?.waypoints.map((point) => point.code.target),
      [
        // The imports above the first declaration, which nobody went looking
        // for: they are the gap before it.
        { focus: { from: 1, to: 4 } },
        { symbol: "first" },
        // And the blank line between the two, for the same reason. A partition
        // has no leftovers, so every line belongs to exactly one card.
        { focus: { from: 13, to: 13 } },
        { symbol: "second" },
      ],
    )
  })

  test("covers every line exactly once", () => {
    const [section] = sectionsFrom([created])

    const seen = new Set<number>()
    for (const point of section?.waypoints ?? []) {
      const target = point.code.target
      assert.ok("focus" in target || "symbol" in target)
      const range =
        "focus" in target
          ? target.focus
          : target.symbol === "first"
            ? { from: 5, to: 12 }
            : { from: 14, to: 30 }
      for (let line = range.from; line <= range.to; line += 1) {
        assert.ok(!seen.has(line), `line ${String(line)} is covered twice`)
        seen.add(line)
      }
    }
    assert.strictEqual(seen.size, 30)
  })

  test("names the one hunk from every card, because there is only one", () => {
    const [section] = sectionsFrom([created])
    for (const point of section?.waypoints ?? []) {
      assert.deepStrictEqual(point.code.covers, [0])
    }
  })

  test("never names a declaration that reaches above the card", () => {
    /*
     * An interface whose fields are touched is folded away and its fields cut
     * the file instead, so the lines after the last field — the closing brace
     * and a comment — are a gap that touches only the interface. Anchored by
     * its name, that card resolved to the whole interface and marked from its
     * first line, above the field cards before it, and the checker refused the
     * scaffold it had just been handed.
     */
    const symbols = [
      span("Props", 13, 18, "container"),
      span("Props.a", 14, 14, "other"),
      span("Props.b", 15, 15, "other"),
      span("Props.c", 16, 16, "other"),
      span("Props.d", 17, 17, "other"),
      span("run", 23, 51),
    ]
    const [section] = sectionsFrom([
      { path: "src/new.ts", added: [{ from: 1, to: 60 }], symbols, created: true },
    ])

    const targets = section?.waypoints.map((point) => point.code.target) ?? []
    assert.deepStrictEqual(targets, [
      { focus: { from: 1, to: 13 } },
      { symbol: "Props.a" },
      { symbol: "Props.b" },
      { symbol: "Props.c" },
      { symbol: "Props.d" },
      { focus: { from: 18, to: 22 } },
      { symbol: "run" },
      { focus: { from: 52, to: 60 } },
    ])

    // And so, resolved the way the document resolves them, they read down.
    const starts = targets.map((target) =>
      "symbol" in target
        ? (symbols.find((symbol) => symbol.name === target.symbol)?.from ?? -1)
        : target.focus.from,
    )
    assert.deepStrictEqual(starts, [...starts].sort((one, two) => one - two))
  })

  test("leaves it whole when nothing could parse it", () => {
    const [section] = sectionsFrom([{ ...created, symbols: undefined }])

    assert.strictEqual(section?.waypoints.length, 1)
    assert.deepStrictEqual(section.waypoints[0]?.code.target, { focus: { from: 1, to: 30 } })
  })

  test("does not cut an edited file the same way", () => {
    // Same lines, same symbols, but the file existed before: one hunk, one card.
    const [section] = sectionsFrom([{ ...created, created: undefined }])

    assert.strictEqual(section?.waypoints.length, 1)
  })
})

/**
 * Which sections derived their structure.
 *
 * A section built from real declarations is scaffolded. A section built from
 * the diff alone derived nothing — no symbol resolved, no declaration found —
 * and is not.
 */
suite("what counts as scaffolded", () => {
  test("marks a section built from real declarations", () => {
    const [section] = sectionsFrom([
      {
        path: "src/a.ts",
        added: [{ from: 12, to: 14 }],
        symbols: [span("priceOf", 10, 20)],
      },
    ])
    assert.strictEqual(section?.scaffolded, true)
  })

  test("does not mark a section nothing could parse", () => {
    /*
     * The state a whole pull request can land in when no window is open: every
     * waypoint addressed by line range and titled by those lines, which is the
     * diff restated rather than a structure.
     */
    const [section] = sectionsFrom([
      { path: "lib/order.rb", added: [{ from: 3, to: 9 }], symbols: undefined },
    ])

    assert.strictEqual(section?.scaffolded, false)
    // And it is still a section: the change is real and has to be covered.
    assert.strictEqual(section?.waypoints.length, 1)
    assert.deepStrictEqual(section?.waypoints[0]?.code.target, {
      focus: { from: 3, to: 9 },
    })
  })
})
