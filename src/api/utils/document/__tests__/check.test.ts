import { describe, expect, it } from "vitest"
import { checkDocument } from "../check"
import type { StoredDocument, StoredWaypoint } from "../../../../lib/schemas/document/stored"

const head = "4a12380000000000000000000000000000000000"

const code = (marks?: [number, number][]) => ({
  kind: "ref" as const,
  lang: "ts",
  path: "src/a.ts",
  target: { symbol: "f" },
  focus: { from: 1, to: 200 },
  marks: marks?.map(([from, to]) => ({ from, to })),
})

const point = (id: string, marks?: [number, number][]): StoredWaypoint => ({
  id,
  title: id,
  reading: "It does.",
  code: code(marks),
})

const body = {
  context: "x",
  overview: [{ when: "a", then: "b" }],
  implementation: [{ label: "src/a.ts", items: [{ text: "x" }] }],
}

const doc = (over: Record<string, unknown> = {}): StoredDocument =>
  ({
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
    title: "t",
    contextBody: {
      context: "x",
      overview: [{ when: "a", then: "b" }],
      implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
    },
    diagram: { absent: "none" },
    codeWalkthrough: {
      files: [{ path: "src/a.ts", summary: ["Added it."], waypoints: [point("g")] }],
    },
    sources: { "src/a.ts": { at: head } },
    ...over,
  }) as unknown as StoredDocument

describe("checkDocument", () => {
  it("should accept a document whose links all resolve", () => {
    expect(checkDocument(doc())).toEqual([])
  })

  it("should not mind a see pointing at a waypoint not written yet", () => {
    // The overview indexes the tour, and an author writes the index first, so a
    // link to a waypoint that does not exist yet is an ordinary intermediate
    // state. `checkComplete` is where it stops being one.
    const found = checkDocument(
      doc({
        contextBody: {
          context: "x",
          overview: [{ when: "a", then: "b" }],
          implementation: [{ label: "src/a.ts", items: [{ text: "x" }] }],
        },
      }),
    )
    expect(found).toEqual([])
  })

  it("should refuse two waypoints sharing an id", () => {
    // Ids are what every link binds to. A repeat makes one of them unreachable
    // and the other ambiguous.
    const found = checkDocument(
      doc({
        contextBody: body,
        codeWalkthrough: {
          files: [{ path: "src/a.ts", summary: [], waypoints: [point("g"), point("g")] }],
        },
      }),
    )
    expect(found[0]?.message).toContain("more than once")
  })

  it("should refuse marks that go backwards within a file", () => {
    // A tour reads top to bottom and so does the code it points at. Sending the
    // reader back up the file makes the panel jump with them.
    const found = checkDocument(
      doc({
        contextBody: body,
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [point("a", [[100, 110]]), point("b", [[20, 30]])],
            },
          ],
        },
      }),
    )
    // The line it names is where that earlier waypoint starts, not where it
    // ends: the check keeps starts, and "reaches" sent authors to the wrong card.
    expect(found[0]?.message).toContain(
      "marks start at line 20, before line 100, where an earlier waypoint in this file starts.",
    )
  })

  it("should allow marks to restart in the next file", () => {
    // Line numbers restart with every file, so the rule is per section.
    const found = checkDocument(
      doc({
        contextBody: body,
        codeWalkthrough: {
          files: [
            { path: "src/a.ts", summary: [], waypoints: [point("a", [[100, 110]])] },
            { path: "src/b.ts", summary: [], waypoints: [point("b", [[20, 30]])] },
          ],
        },
        sources: { "src/a.ts": { at: head }, "src/b.ts": { at: head } },
      }),
    )
    expect(found).toEqual([])
  })

  it("should refuse a proposal fence in a walkthrough's tour", () => {
    // Allowed only under a finding, where a fix is by definition code that
    // does not exist yet.
    const found = checkDocument(
      doc({
        contextBody: body,
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "g",
                  title: "g",
                  reading: "x",
                  code: {
                    kind: "proposal",
                    lang: "ts",
                    path: "src/a.ts",
                    position: { kind: "new" },
                    body: "x",
                  },
                },
              ],
            },
          ],
        },
      }),
    )
    expect(found[0]?.message).toContain("proposes code")
  })

  it("should refuse two proposals at one position with different bodies", () => {
    // A breakdown repeats the parent's whole proposal and moves only its
    // marks. Two different bodies say to write two different things in one
    // place, and whichever the reader acts on last wins.
    const found = checkDocument(
      doc({
        meta: { kind: "plan", repo: "acme/storefront", name: "p" },
        contextBody: body,
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: ["one", "two"].map((text, i) => ({
                id: `p${String(i)}`,
                title: "p",
                reading: "x",
                code: {
                  kind: "proposal",
                  lang: "ts",
                  path: "src/a.ts",
                  position: { kind: "after", line: 10 },
                  body: text,
                },
              })),
            },
          ],
        },
      }),
    )
    expect(found.some((f) => f.message.includes("different body"))).toBe(true)
  })

  it("should allow two proposals at one position with the same body", () => {
    // The ordinary shape of a plan's breakdown: the child repeats the parent's
    // whole proposal and moves only its marks.
    const proposal = (marks: [number, number][]) => ({
      kind: "proposal" as const,
      lang: "ts",
      path: "src/a.ts",
      position: { kind: "after" as const, line: 10 },
      body: "same",
      marks: marks.map(([from, to]) => ({ from, to })),
    })
    const found = checkDocument(
      doc({
        meta: { kind: "plan", repo: "acme/storefront", name: "p" },
        contextBody: body,
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "parent",
                  title: "p",
                  reading: "x",
                  code: proposal([[1, 4]]),
                  children: [
                    { id: "k1", title: "a", reading: "x", code: proposal([[1, 2]]) },
                    { id: "k2", title: "b", reading: "x", code: proposal([[3, 4]]) },
                  ],
                },
              ],
            },
          ],
        },
      }),
    )
    expect(found).toEqual([])
  })
})

/*
 * A solution replaces the lines its card is about, so there have to be some.
 *
 * The position is implied rather than written — that is what makes a fix
 * previewable — which means the card has to carry a reference for it to be
 * implied from.
 */
describe("checkDocument and a finding's solution", () => {
  const found = {
    id: "f1",
    kind: "bug" as const,
    title: "t",
    reading: "r",
    solution: { lang: "ts", body: "const x = 1" },
  }

  const withPoint = (over: Record<string, unknown>) =>
    doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: ["Added it."],
            waypoints: [{ ...point("g"), ...over }],
          },
        ],
      },
    })

  it("should refuse a fix on a card that shows no code", () => {
    const problems = checkDocument(withPoint({ code: null, findings: [found] }))
    expect(problems.some((one) => one.message.includes("no code"))).toBe(true)
  })

  it("should accept a fix on a card that references code", () => {
    const problems = checkDocument(withPoint({ findings: [found] }))
    expect(problems.filter((one) => one.at.includes("solution"))).toEqual([])
  })

  // A document finding has no card, so its own `code` is the lines it replaces.
  it("should refuse a fix on a document finding that names no code", () => {
    const problems = checkDocument(doc({ findings: [{ ...found, code: null }] }))
    expect(problems.map((one) => one.at)).toEqual(["findings[0].solution"])
  })

  it("should refuse a fix on a document finding whose code is a proposal", () => {
    const proposal = { kind: "proposal", lang: "ts", path: "src/a.ts", position: { kind: "after", line: 1 }, body: "x" }
    const problems = checkDocument(doc({ findings: [{ ...found, code: proposal }] }))
    expect(problems.some((one) => one.at === "findings[0].solution")).toBe(true)
  })

  it("should accept a fix on a document finding that references code", () => {
    const problems = checkDocument(doc({ findings: [{ ...found, code: code() }] }))
    expect(problems.filter((one) => one.at.includes("solution"))).toEqual([])
  })
})
