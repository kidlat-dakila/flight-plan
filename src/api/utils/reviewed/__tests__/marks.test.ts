import * as assert from "assert"
import type { StoredDocument, StoredWaypoint } from "../../../../lib/schemas/document/stored"
import {
  NO_MARKS,
  applyChange,
  contentHash,
  parseChange,
  prune,
  reviewedState,
  type ReviewedChange,
  type ReviewedMarks,
} from "../marks"

/**
 * The reviewed-mark rules: a mark covers what is under it, comes back
 * when its item changes, and can be undone without losing its siblings.
 */

function waypoint(id: string, children?: StoredWaypoint[]): StoredWaypoint {
  return { id, title: `The ${id} step`, reading: `What ${id} does.`, code: null, ...(children ? { children } : {}) }
}

/** Two files: `a.ts` with a parent of two children and a leaf, `b.ts` with one leaf. */
function documentOf(overrides: { readingOfLeaf?: string } = {}): StoredDocument {
  const leaf = waypoint("leaf")
  if (overrides.readingOfLeaf !== undefined) leaf.reading = overrides.readingOfLeaf
  return {
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head: "abc1234", status: "complete" },
    title: "A change",
    contextBody: { context: "Why." },
    diagram: { absent: "None." },
    codeWalkthrough: {
      files: [
        { path: "a.ts", summary: [], waypoints: [waypoint("parent", [waypoint("one"), waypoint("two")]), leaf] },
        { path: "b.ts", summary: [], waypoints: [waypoint("other")] },
      ],
    },
    sources: {},
  } as unknown as StoredDocument
}

const run = (document: StoredDocument, ...changes: ReviewedChange[]): ReviewedMarks =>
  changes.reduce((marks, change) => applyChange(document, marks, change), NO_MARKS)

const mark = (target: ReviewedChange["target"]): ReviewedChange => ({ op: "mark", target })
const unmark = (target: ReviewedChange["target"]): ReviewedChange => ({ op: "unmark", target })

suite("reviewed marks", () => {
  const document = documentOf()

  test("nothing is reviewed until something is marked", () => {
    assert.deepStrictEqual(reviewedState(document, NO_MARKS), { waypoints: [], files: [] })
  })

  test("a marked parent covers its children, and the mark is on the parent only", () => {
    const marks = run(document, mark({ waypoint: "one" }), mark({ waypoint: "parent" }))
    assert.deepStrictEqual(Object.keys(marks.waypoints), ["parent"])
    assert.deepStrictEqual(reviewedState(document, marks).waypoints, ["parent", "one", "two"])
  })

  test("a parent whose children are all marked is not reviewed itself", () => {
    const marks = run(document, mark({ waypoint: "one" }), mark({ waypoint: "two" }))
    assert.deepStrictEqual(reviewedState(document, marks), { waypoints: ["one", "two"], files: [] })
  })

  test("a file is reviewed when every waypoint in it is", () => {
    const marks = run(document, mark({ waypoint: "parent" }), mark({ waypoint: "leaf" }))
    assert.deepStrictEqual(reviewedState(document, marks).files, ["a.ts"])
  })

  test("a file marked directly covers its waypoints", () => {
    const marks = run(document, mark({ waypoint: "leaf" }), mark({ file: "a.ts" }))
    assert.deepStrictEqual(marks.waypoints, {}, "the waypoint mark under the file goes")
    assert.deepStrictEqual(reviewedState(document, marks), {
      waypoints: ["parent", "one", "two", "leaf"],
      files: ["a.ts"],
    })
  })

  test("unmarking a file shows all of it again", () => {
    const marks = run(document, mark({ waypoint: "parent" }), mark({ waypoint: "leaf" }), unmark({ file: "a.ts" }))
    assert.deepStrictEqual(reviewedState(document, marks), { waypoints: [], files: [] })
  })

  test("unmarking a child of a marked parent keeps its sibling reviewed", () => {
    const marks = run(document, mark({ waypoint: "parent" }), unmark({ waypoint: "one" }))
    assert.deepStrictEqual(reviewedState(document, marks).waypoints, ["two"])
  })

  test("unmarking a child inside a marked file keeps everything else reviewed", () => {
    const marks = run(document, mark({ file: "a.ts" }), unmark({ waypoint: "two" }))
    assert.deepStrictEqual(reviewedState(document, marks), { waypoints: ["one", "leaf"], files: [] })
  })

  test("a mark comes back unmarked when its item changes", () => {
    const marks = run(document, mark({ waypoint: "leaf" }), mark({ file: "b.ts" }))
    const rewritten = documentOf({ readingOfLeaf: "What leaf does now." })
    assert.deepStrictEqual(reviewedState(rewritten, marks), { waypoints: ["other"], files: ["b.ts"] })
    assert.deepStrictEqual(Object.keys(prune(rewritten, marks).waypoints), [], "and is pruned on the next write")
  })

  test("a changed child brings its marked parent back", () => {
    const marks = run(document, mark({ waypoint: "parent" }))
    const changed = documentOf()
    const parent = changed.codeWalkthrough.files[0]?.waypoints[0]
    if (parent?.children?.[0] === undefined) throw new Error("fixture")
    parent.children[0].title = "Renamed"
    assert.deepStrictEqual(reviewedState(changed, marks).waypoints, [])
  })

  test("marks on items the document does not have change nothing", () => {
    assert.deepStrictEqual(run(document, mark({ waypoint: "gone" }), mark({ file: "gone.ts" })), NO_MARKS)
  })

  test("the hash does not depend on key order", () => {
    assert.strictEqual(contentHash({ a: 1, b: [1, { c: 2, d: 3 }] }), contentHash({ b: [1, { d: 3, c: 2 }], a: 1 }))
  })

  test("parses a change and refuses anything else", () => {
    assert.deepStrictEqual(parseChange({ op: "mark", waypoint: "x" }), { op: "mark", target: { waypoint: "x" } })
    assert.deepStrictEqual(parseChange({ op: "unmark", file: "a.ts" }), { op: "unmark", target: { file: "a.ts" } })
    assert.strictEqual(parseChange({ op: "mark", waypoint: "x", file: "a.ts" }), null)
    assert.strictEqual(parseChange({ op: "toggle", waypoint: "x" }), null)
    assert.strictEqual(parseChange("mark"), null)
  })
})
