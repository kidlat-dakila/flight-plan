import * as assert from "node:assert/strict"
import { suite, test } from "vitest"
import { worklistOf } from "../../utils/document/worklist"
import type { StoredDocument } from "../../../lib/schemas/document/stored"
import {
  idsForPath,
  lineageOfNode,
  lineageOfWaypoint,
  overviewOf,
  unfilledOf,
} from "../projection"
import { withPositions } from "../fill"
import type { DocumentInput } from "../../../lib/schemas/document/schema"

/**
 * The read surface, and the one structural edit the write surface allows.
 *
 * What these hold down is the property the whole design rests on: the worklist
 * and the gate are one computation, and the projections leave the document
 * alone. A projection that quietly dropped a card would look exactly like a
 * finished document from the agent's side.
 */

const ref = (path: string, from: number, to: number) => ({
  kind: "ref" as const,
  lang: "ts",
  path,
  target: { focus: { from, to } },
  focus: { from, to },
})

const doc = (over: Partial<StoredDocument> = {}): StoredDocument =>
  ({
    schema: 1,
    meta: {
      kind: "walkthrough",
      repo: "acme/storefront",
      at: { pr: 7 },
      head: "a".repeat(40),
      base: "b".repeat(40),
      status: "drafting",
    },
    title: "Prices an order",
    contextBody: { context: "Why anyone should care." },
    diagram: null,
    codeWalkthrough: { files: [] },
    sources: {},
    ...over,
  }) as unknown as StoredDocument

suite("the overview projection", () => {
  test("carries ids and sources but no prose", () => {
    const found = overviewOf(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "w1",
                  title: "priceOf",
                  draft: true,
                  reading: null,
                  code: ref("src/a.ts", 10, 20),
                },
              ],
            },
          ],
        },
      } as never),
    )

    const first = found.files[0]?.waypoints[0]
    assert.strictEqual(first?.id, "w1")
    assert.strictEqual(first.path, "src/a.ts")
    assert.deepStrictEqual(first.lines, { from: 10, to: 20 })
    // The point of the projection: nothing here is prose.
    assert.ok(!("reading" in first))
  })

  test("counts children rather than walking them at depth 1", () => {
    const found = overviewOf(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "w1",
                  title: "priceOf",
                  reading: "r",
                  code: ref("src/a.ts", 10, 20),
                  children: [
                    { id: "w2", title: "a", reading: "r", code: ref("src/a.ts", 11, 12) },
                    { id: "w3", title: "b", reading: "r", code: ref("src/a.ts", 13, 14) },
                  ],
                },
              ],
            },
          ],
        },
      } as never),
    )
    assert.strictEqual(found.files[0]?.waypoints.length, 1)
    assert.strictEqual(found.files[0]?.waypoints[0]?.childCount, 2)
  })

  test("reports what is left, by kind", () => {
    const found = overviewOf(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "w1",
                  title: "priceOf",
                  draft: true,
                  reading: null,
                  code: ref("src/a.ts", 10, 20),
                },
              ],
            },
          ],
        },
      } as never),
    )
    assert.strictEqual(found.unfilled.by.reading, 1)
    assert.strictEqual(found.unfilled.by.title, 1)
    assert.strictEqual(found.unfilled.by.overview, 1)
  })
})

suite("the worklist and the gate", () => {
  /*
   * The property this exists for.
   *
   * `complete` refuses from `checkComplete` and `nodes` hands out `unfilledOf`,
   * and if those were separate computations the drift would show up as an agent
   * emptying the list and being refused anyway.
   */
  test("are the same computation", () => {
    const one = doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              { id: "w1", title: "t", draft: true, reading: null, code: ref("src/a.ts", 1, 2) },
            ],
          },
        ],
      },
    } as never)
    assert.deepStrictEqual(unfilledOf(one), worklistOf(one, one.meta.kind))
  })

})

suite("lineage", () => {
  const nested = doc({
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [
            {
              id: "w1",
              title: "parent",
              reading: "r",
              code: ref("src/a.ts", 1, 30),
              children: [
                { id: "w2", title: "one", reading: "r", code: ref("src/a.ts", 5, 6) },
                { id: "w3", title: "two", reading: "r", code: ref("src/a.ts", 9, 10) },
              ],
            },
          ],
        },
      ],
    },
  } as never)

  test("returns the chain down to the card and drops the siblings", () => {
    const found = lineageOfWaypoint(nested, "w3")
    assert.deepStrictEqual(
      found?.chain.map((one) => one.id),
      ["w1", "w3"],
    )
    assert.strictEqual(found?.path, "src/a.ts")
  })

  test("is null for an id the document has not got", () => {
    assert.strictEqual(lineageOfWaypoint(nested, "w9"), null)
  })

  test("walks a diagram the same way", () => {
    const board = doc({
      diagram: {
        type: "code",
        nodes: [
          { id: "n1", label: "a", children: [{ id: "n2", label: "b", children: [{ id: "n3", label: "c" }] }] },
          { id: "n4", label: "d" },
        ],
      },
    } as never)
    assert.deepStrictEqual(
      lineageOfNode(board, "n3")?.map((one) => one.id),
      ["n1", "n2", "n3"],
    )
  })
})

suite("annotating a diff with the board", () => {
  test("names every card that covers a path", () => {
    const one = doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              { id: "w1", title: "t", reading: "r", code: ref("src/a.ts", 1, 2) },
              { id: "w2", title: "t", reading: "r", code: ref("src/b.ts", 1, 2) },
            ],
          },
        ],
      },
    } as never)
    assert.deepStrictEqual(idsForPath(one, "src/a.ts"), ["w1"])
    assert.deepStrictEqual(idsForPath(one, "src/nothing.ts"), [])
  })
})

suite("moving a card among its siblings", () => {
  const input = (): DocumentInput =>
    ({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              { id: "w1", title: "one", reading: "r", code: null },
              { id: "w2", title: "two", reading: "r", code: null },
              { id: "w3", title: "three", reading: "r", code: null },
            ],
          },
        ],
      },
    }) as unknown as DocumentInput

  const order = (document: DocumentInput): string[] =>
    document.codeWalkthrough.files[0]?.waypoints.map((one) => one.id) ?? []

  test("inserts at the position and shifts the rest down", () => {
    assert.deepStrictEqual(order(withPositions(input(), [{ id: "w3", position: 1 }])), [
      "w3",
      "w1",
      "w2",
    ])
  })

  test("reads the position as where the card ends up, moving either way", () => {
    // The off-by-one that matters: removing first shrinks the list, so an
    // index into the pre-removal list would land one place short.
    assert.deepStrictEqual(order(withPositions(input(), [{ id: "w1", position: 3 }])), [
      "w2",
      "w3",
      "w1",
    ])
  })

  test("resolves several moves against the list as it was", () => {
    assert.deepStrictEqual(
      order(withPositions(input(), [{ id: "w3", position: 1 }, { id: "w1", position: 3 }])),
      ["w3", "w2", "w1"],
    )
  })

  test("refuses two cards claiming one position", () => {
    assert.throws(
      () => withPositions(input(), [{ id: "w1", position: 2 }, { id: "w2", position: 2 }]),
      /One position holds one card/,
    )
  })

  test("refuses a position off the end rather than clamping it", () => {
    assert.throws(() => withPositions(input(), [{ id: "w1", position: 9 }]), /refused rather than clamped/)
  })

  test("refuses a nested card, which is what stops reparenting", () => {
    const deep = {
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              {
                id: "w1",
                title: "parent",
                reading: "r",
                code: null,
                children: [
                  { id: "w2", title: "a", reading: "r", code: null },
                  { id: "w3", title: "b", reading: "r", code: null },
                ],
              },
            ],
          },
        ],
      },
    } as unknown as DocumentInput
    assert.throws(() => withPositions(deep, [{ id: "w2", position: 1 }]), /not a top-level card/)
  })

  test("leaves a document alone when nothing carries a position", () => {
    const before = input()
    assert.strictEqual(withPositions(before, [{ id: "w1" }]), before)
  })
})
