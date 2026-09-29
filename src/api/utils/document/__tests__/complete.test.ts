import { describe, expect, it } from "vitest"
import { NOT_WRITTEN, checkComplete } from "../complete"
import type { StoredDocument } from "../../../../lib/schemas/document/stored"

const head = "4a12380000000000000000000000000000000000"

const code = {
  kind: "ref" as const,
  lang: "ts",
  path: "src/a.ts",
  target: { symbol: "f" },
  focus: { from: 1, to: 10 },
}

const doc = (over: Record<string, unknown> = {}): StoredDocument =>
  ({
    schema: 1,
    meta: {
      kind: "walkthrough",
      repo: "acme/storefront",
      at: { pr: 1 },
      head,
      status: "complete",
    },
    title: "t",
    contextBody: {
      context: "x",
      overview: [{ when: "a", then: "b" }],
      implementation: [{ label: "src/a.ts", items: [{ text: "x" }] }],
    },
    diagram: { absent: "No flow to draw." },
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [{ id: "g", title: "Added it", reading: "x", code }],
        },
      ],
    },
    sources: { "src/a.ts": { at: head } },
    ...over,
  }) as unknown as StoredDocument

const errors = (d: StoredDocument) =>
  checkComplete(d).filter((f) => f.severity === "error")

describe("checkComplete", () => {
  it("should accept a finished walkthrough", () => {
    expect(checkComplete(doc())).toEqual([])
  })

  it("should refuse a finished walkthrough with no overview", () => {
    const { overview: _drop, ...rest } = doc().contextBody
    const found = errors(doc({ contextBody: rest }))
    expect(found[0]?.at).toBe("contextBody.overview")
    expect(found[0]?.message).toContain("when, then")
  })

  it("should refuse a finished walkthrough with no implementation list", () => {
    const { implementation: _drop, ...rest } = doc().contextBody
    expect(errors(doc({ contextBody: rest }))[0]?.at).toBe(
      "contextBody.implementation",
    )
  })

  it("should refuse a finished walkthrough with no tour", () => {
    // A document with no waypoints is a summary.
    const found = errors(doc({ codeWalkthrough: { files: [] } }))
    expect(found[0]?.message).toContain("at least one file section")
  })

  it("should refuse a file section with nothing under it", () => {
    // Worse than omitting it: the reader is told something is missing without
    // being told what.
    const found = errors(
      doc({
        codeWalkthrough: { files: [{ path: "src/a.ts", summary: [], waypoints: [] }] },
      }),
    )
    expect(found[0]?.message).toContain("no waypoints")
  })

  it("should ask nothing of a diagram that says why there is none", () => {
    // `absent` is already an answer. Demanding an entry point for a change with
    // no flow would be demanding a trigger for a trace that does not exist.
    expect(
      errors(doc({ diagram: { absent: "No flow to draw." } })).filter((one) =>
        one.message.includes("entry"),
      ),
    ).toHaveLength(0)
  })

  it("should warn rather than refuse when there is no diagram", () => {
    // A document without one still reads, and the failure is invisible from the
    // author's side, so it is said every time.
    const found = checkComplete(doc({ diagram: null }))
    expect(found.every((f) => f.severity === "warning")).toBe(true)
    expect(found[0]?.message).toContain("absent")
  })

  it("should warn about a waypoint with no code", () => {
    const found = checkComplete(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [{ id: "g", title: "Added it", reading: "x", code: null }],
            },
          ],
        },
      }),
    )
    expect(found[0]?.severity).toBe("warning")
    expect(found[0]?.message).toContain("stays empty")
  })

  it("should refuse a scaffolded card nobody wrote a reading for", () => {
    /*
     * The one failure scaffolding makes *easier* to reach. Every card already
     * exists and looks plausible, so an agent that stopped early leaves
     * something a reader takes for an omission in the change rather than a gap
     * in the document.
     */
    const found = checkComplete(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                { id: "g", title: "priceOf", reading: NOT_WRITTEN, code },
                { id: "h", title: "levelsFor", reading: "Written.", code },
              ],
            },
          ],
        },
      }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.severity).toBe("error")
    expect(found[0]?.message).toContain("g")
    expect(found[0]?.message).not.toContain("h,")
  })

  it("should refuse a title the scaffold wrote and nobody replaced", () => {
    /*
     * The other half of the same bargain, and the half nothing checked. A
     * scaffolded title is the declaration's name or `Lines 148-150` — a bare
     * noun, which the format calls the one thing a title must never be, because
     * it says which code the card is about and nothing about why the reader is
     * being shown it. Unlike a missing reading it looks authored, so it is
     * marked at the point it is written rather than guessed at here.
     */
    const found = checkComplete(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                { id: "g", title: "priceOf", draft: true, reading: "Written.", code },
                { id: "h", title: "Refuses an unpriced order", reading: "Written.", code },
              ],
            },
          ],
        },
      }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.severity).toBe("error")
    expect(found[0]?.message).toContain("g")
    expect(found[0]?.message).toContain("update-nodes")
  })

  it("should accept a diagram that carries no unresolved calls at all", () => {
    // A document written by hand, or one scaffolded from code that resolved
    // completely. Neither is a document to refuse.
    const found = checkComplete(
      doc({
        diagram: {
          type: "code",
          entries: [{ id: "e", trigger: "user-action", label: "Presses Pay", into: "n1" }],
          nodes: [{ id: "n1", type: "logic", label: "Prices the order" }],
        },
      }),
    )
    expect(found.find((one) => one.message.includes("could not be resolved"))).toBeUndefined()
  })

  it("should reach an unwritten card nested inside a written one", () => {
    const found = checkComplete(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "g",
                  title: "priceOf",
                  reading: "Written.",
                  code,
                  children: [
                    { id: "a", title: "A", reading: "Written.", code },
                    { id: "b", title: "B", reading: NOT_WRITTEN, code },
                  ],
                },
              ],
            },
          ],
        },
      }),
    )
    expect(found.some((one) => one.message.includes("b"))).toBe(true)
  })

  it("should reach a waypoint nested inside another", () => {
    const found = checkComplete(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "g",
                  title: "Added it",
                  reading: "x",
                  code,
                  children: [
                    { id: "a", title: "A", reading: "x", code },
                    { id: "b", title: "B", reading: "x", code: null },
                  ],
                },
              ],
            },
          ],
        },
      }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.message).toContain('"B"')
  })
})

/*
 * A diagram node's label is work like any other.
 *
 * It was not tracked at all: `complete` returned finished while every node on
 * the board still carried the declaration name the scaffold wrote, so a
 * walkthrough could ship with raw code where its readings should be and nobody
 * was told.
 */
describe("checkComplete, diagram node labels", () => {
  const board = (nodes: unknown[]) => ({ type: "code", nodes })

  it("should refuse a finished walkthrough whose node labels are still the scaffold's", () => {
    const found = errors(
      doc({ diagram: board([{ id: "n1", type: "logic", label: "priceOf", draft: true }]) }),
    )
    expect(found[0]?.at).toBe("diagram")
    expect(found[0]?.message).toContain("n1")
    expect(found[0]?.message).toContain("what the code does")
  })

  it("should accept a board whose labels were written", () => {
    expect(
      errors(
        doc({
          diagram: board([
            { id: "n1", type: "logic", label: "Refuses an order it cannot fulfil" },
          ]),
        }),
      ),
    ).toEqual([])
  })

  it("should name every draft node, not only the first", () => {
    const found = errors(
      doc({
        diagram: board([
          { id: "n1", type: "logic", label: "a", draft: true },
          {
            id: "n2",
            type: "logic",
            label: "b",
            children: [{ id: "n3", type: "logic", label: "c", draft: true }],
          },
        ]),
      }),
    )
    expect(found[0]?.message).toContain("n1")
    expect(found[0]?.message).toContain("n3")
    expect(found[0]?.message).not.toContain("n2")
  })
})

/*
 * A bug, a risk or a nit says what the lines should be instead. The rule waits
 * for `complete`, because a finding is often written before its fix.
 */
describe("checkComplete and a finding's solution", () => {
  const fix = { lang: "ts", body: "const x = 1" }
  const found = (over: Record<string, unknown> = {}) => ({
    id: "f1",
    kind: "nit",
    title: "t",
    reading: "r",
    ...over,
  })
  const onWaypoint = (finding: Record<string, unknown>, host: unknown = code) =>
    doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [{ id: "g", title: "Added it", reading: "x", code: host, findings: [finding] }],
          },
        ],
      },
    })
  const unfixed = (d: StoredDocument) => errors(d).filter((one) => one.message.includes("no solution"))

  it("should refuse a waypoint nit with no solution, naming it", () => {
    const found_ = unfixed(onWaypoint(found()))
    expect(found_).toHaveLength(1)
    expect(found_[0]?.message).toContain("f1")
  })

  it("should refuse a document bug with no solution when it names lines", () => {
    expect(unfixed(doc({ findings: [found({ kind: "bug", code })] }))).toHaveLength(1)
  })

  it("should accept a bug, a risk and a nit that each carry one", () => {
    const d = doc({
      findings: [found({ id: "d1", kind: "bug", code, solution: fix })],
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              {
                id: "g",
                title: "Added it",
                reading: "x",
                code,
                findings: [found({ id: "w1", kind: "risk", solution: fix }), found({ id: "w2", solution: fix })],
              },
            ],
          },
        ],
      },
    })
    expect(unfixed(d)).toEqual([])
  })

  it("should not ask a question for one", () => {
    expect(unfixed(onWaypoint(found({ kind: "question" })))).toEqual([])
    expect(unfixed(doc({ findings: [found({ kind: "question", code })] }))).toEqual([])
  })

  it("should not ask for one where there are no lines to replace", () => {
    const proposal = { kind: "proposal", lang: "ts", path: "src/a.ts", position: { kind: "after", line: 1 }, body: "x" }
    expect(unfixed(onWaypoint(found(), null))).toEqual([])
    expect(unfixed(onWaypoint(found(), proposal))).toEqual([])
    expect(unfixed(doc({ findings: [found({ kind: "bug", code: null })] }))).toEqual([])
  })
})
