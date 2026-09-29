import { describe, expect, it } from "vitest"
import { storedDocument } from "../stored"

const head = "4a12380000000000000000000000000000000000"

const base = {
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
    files: [
      {
        path: "src/a.ts",
        summary: ["Added it."],
        waypoints: [
          {
            id: "g",
            title: "Added it",
            reading: "It does the thing.",
            code: {
              kind: "ref",
              lang: "ts",
              path: "src/a.ts",
              target: { symbol: "hasStock" },
              covers: [0],
              focus: [145, 163],
              marks: [[148, 150]],
              expect: "export async function hasStock(",
            },
          },
        ],
      },
    ],
  },
  sources: {
    "src/a.ts": {
      at: head,
      hunks: { added: [[148, 150]], removed: [{ after: 147, lines: ["  old()"] }] },
    },
  },
}

describe("storedDocument", () => {
  it("should read a resolved document", () => {
    const parsed = storedDocument.parse(base)
    const code = parsed.codeWalkthrough.files[0]?.waypoints[0]?.code
    expect(code).toMatchObject({
      focus: { from: 145, to: 163 },
      expect: "export async function hasStock(",
    })
  })

  it("should read a new file's diff, which the diff reader marks created", () => {
    // A walkthrough of a change that adds a file was stored with this mark
    // and then refused on every read: "Unrecognized key: created".
    const created = {
      ...base,
      sources: { "src/a.ts": { at: head, hunks: { added: [[1, 200]], removed: [], created: true } } },
    }
    expect(storedDocument.safeParse(created).success).toBe(true)
    const unknown = {
      ...base,
      sources: { "src/a.ts": { at: head, hunks: { added: [], removed: [], renamed: true } } },
    }
    expect(storedDocument.safeParse(unknown).success).toBe(false)
  })

  it("should require a focus on a stored reference", () => {
    // Unresolved is not a state the renderer can draw. If the symbol could not
    // be found, the write failed and nothing was stored.
    const files = structuredClone(base.codeWalkthrough.files)
    delete (files[0]!.waypoints[0]!.code as Record<string, unknown>)["focus"]
    expect(
      storedDocument.safeParse({ ...base, codeWalkthrough: { files } }).success,
    ).toBe(false)
  })

  it("should still check the target it resolved from", () => {
    // The stored layer keeps the authored target so the resolution can be
    // re-run. Keeping it as an unchecked blob would let a malformed one
    // through the one gate that reads it.
    const files = structuredClone(base.codeWalkthrough.files)
    ;(files[0]!.waypoints[0]!.code as Record<string, unknown>)["target"] = {
      symbol: "",
    }
    expect(
      storedDocument.safeParse({ ...base, codeWalkthrough: { files } }).success,
    ).toBe(false)
  })

  it("should require a sources entry for every path a fence names", () => {
    expect(storedDocument.safeParse({ ...base, sources: {} }).success).toBe(false)
  })

  it("should read a plan source as the working tree", () => {
    // `at: null` is the honest value: a plan resolves against a tree, not a
    // commit, and there is no sha to record.
    const parsed = storedDocument.parse({
      ...base,
      meta: { kind: "plan", repo: "acme/storefront", name: "p" },
      sources: { "src/a.ts": { at: null } },
    })
    expect(parsed.sources["src/a.ts"]?.at).toBeNull()
  })
})

/*
 * `needsAttention`, and the example it replaced.
 *
 * A waypoint used to carry a worked example. It now carries the agent's reason
 * for saying a reviewer must not skim this change — presence is the flag, the
 * string is the reasoning, so a chip with no reason is unrepresentable.
 *
 * Documents written before the swap are still on disk, and every object here is
 * strict, so a stored `example` would stop them opening. It is dropped on the
 * way in instead: the examples are going either way, and refusing the whole
 * walkthrough over one retired field is a worse answer than losing them.
 */
describe("storedDocument and needsAttention", () => {
  const withWaypoint = (over: Record<string, unknown>) => ({
    ...base,
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [
            { id: "w1", title: "t", reading: "r", code: null, ...over },
          ],
        },
      ],
    },
  })

  const firstWaypoint = (doc: unknown) => {
    const parsed = storedDocument.parse(doc)
    return parsed.codeWalkthrough.files[0]?.waypoints[0]
  }

  it("should accept a waypoint carrying the reasoning", () => {
    const point = firstWaypoint(
      withWaypoint({ needsAttention: "The retry path can double-charge." }),
    )
    expect(point?.needsAttention).toBe("The retry path can double-charge.")
  })

  it("should accept a waypoint without one, which is the ordinary case", () => {
    expect(firstWaypoint(withWaypoint({}))?.needsAttention).toBeUndefined()
  })

  it("should refuse an empty reason, which is a chip with nothing behind it", () => {
    expect(() => storedDocument.parse(withWaypoint({ needsAttention: "" }))).toThrow()
  })

  it("should drop a retired example rather than refuse the document", () => {
    const point = firstWaypoint(
      withWaypoint({
        example: { summary: "In and out", cases: [{ lang: "ts", code: "f()" }] },
      }),
    )
    expect(point).toBeDefined()
    expect((point as Record<string, unknown>)["example"]).toBeUndefined()
  })

  it("should drop one nested in a child too", () => {
    const point = firstWaypoint(
      withWaypoint({
        children: [
          {
            id: "w2",
            title: "t",
            reading: "r",
            code: null,
            example: { summary: "s", cases: [{ lang: "ts", code: "f()" }] },
          },
          { id: "w3", title: "t", reading: "r", code: null },
        ],
      }),
    )
    expect((point?.children?.[0] as Record<string, unknown> | undefined)?.["example"]).toBeUndefined()
  })
})

/*
 * Findings on the card they are about.
 *
 * A solution is the replacement for that card's lines — no path, no position —
 * which is what lets the panel preview it against the real file without
 * reconciling anything. A document written before the move carries an array of
 * waypoints under the same name, and that is dropped rather than refused.
 */
describe("storedDocument and findings on waypoints", () => {
  const withWaypoint = (over: Record<string, unknown>) => ({
    ...base,
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [{ id: "w1", title: "t", reading: "r", code: null, ...over }],
        },
      ],
    },
  })

  const found = (over: Record<string, unknown> = {}) => ({
    id: "f1",
    kind: "bug",
    title: "Negative hold reads as stock",
    reading: "It subtracts without checking the sign.",
    ...over,
  })

  const parseWaypoint = (doc: unknown) =>
    storedDocument.parse(doc).codeWalkthrough.files[0]?.waypoints[0]

  it("should accept a waypoint carrying findings", () => {
    expect(parseWaypoint(withWaypoint({ findings: [found()] }))?.findings).toHaveLength(1)
  })

  it("should accept a solution as a bare replacement", () => {
    const point = parseWaypoint(
      withWaypoint({
        findings: [found({ solution: { lang: "ts", body: "const x = 1" } })],
      }),
    )
    expect(point?.findings?.[0]?.solution?.body).toBe("const x = 1")
  })

  it("should refuse a solution that names a path, which the card already does", () => {
    expect(() =>
      storedDocument.parse(
        withWaypoint({
          findings: [
            found({ solution: { lang: "ts", body: "x", path: "src/a.ts" } }),
          ],
        }),
      ),
    ).toThrow()
  })

  it("should refuse a question carrying a fix", () => {
    expect(() =>
      storedDocument.parse(
        withWaypoint({
          findings: [
            found({ kind: "question", solution: { lang: "ts", body: "x" } }),
          ],
        }),
      ),
    ).toThrow()
  })

  it("should refuse an empty findings array, which reports nothing", () => {
    expect(() => storedDocument.parse(withWaypoint({ findings: [] }))).toThrow()
  })

  it("should keep a document finding's solution", () => {
    const doc = storedDocument.parse({
      ...base,
      findings: [{ ...found(), code: null, solution: { lang: "ts", body: "const x = 1" } }],
    })
    expect(doc.findings?.[0]?.solution?.body).toBe("const x = 1")
  })

  it("should drop a document finding's retired solution walkthrough", () => {
    const doc = storedDocument.parse({
      ...base,
      findings: [
        {
          id: "f1",
          kind: "bug",
          title: "t",
          reading: "r",
          code: null,
          solution: [{ id: "s1", title: "Fix", reading: "Do it.", code: null }],
        },
      ],
    })
    expect(doc.findings?.[0]).toBeDefined()
    expect((doc.findings?.[0] as Record<string, unknown>)["solution"]).toBeUndefined()
  })
})
