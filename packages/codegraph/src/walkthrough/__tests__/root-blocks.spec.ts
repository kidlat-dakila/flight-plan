import { createCodeBlock, createWaypoint, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { isRootBlockKey, rootBlockKeysOf, rootBlockLabelOf, rootBlocksOf } from "@/walkthrough/root-blocks"
import type { CodeBlock } from "@flightplan/configurations"

const ADDED_SOURCE = parseMarkedSource(PRICE_PATH, "typescript", ["+export const total = () =>", "+  1", " export const keep = 2"].join("\n"))

const spanning = (lineStart: number, lineEnd: number) => [{ start: { line: lineStart, column: 1 }, end: { line: lineEnd, column: 1 } }]

const waypointOn = (...codeBlocks: CodeBlock[]) => createWaypoint("w", "total", { codeBlocks })

const keysOf = (waypoint: ReturnType<typeof waypointOn>, source: typeof priceSource) => rootBlockKeysOf(rootBlocksOf(waypoint), source)

describe("rootBlockKeysOf of rootBlocksOf", () => {
  it("calls a root block added when every row of it is added", () => {
    const total = createCodeBlock("total", PRICE_PATH, { lineOfCodeRangeReference: spanning(1, 2) })

    expect(keysOf(waypointOn(total), ADDED_SOURCE)).toStrictEqual(["block:logic:added"])
  })

  it("names a root block by its primary classification", () => {
    const page = createCodeBlock("page", PRICE_PATH, { type: "component", classifications: ["page", "component"], lineOfCodeRangeReference: spanning(1, 2) })

    expect(keysOf(waypointOn(page), ADDED_SOURCE)).toStrictEqual(["block:page:added"])
  })

  it("calls a root block modified when it changes only some of its rows, or replaces lines that were there", () => {
    const priceOf = createCodeBlock("priceOf", PRICE_PATH, { type: "root-variable", classifications: ["ui-state"], lineOfCodeRangeReference: spanning(11, 12) })
    const keep = createCodeBlock("keep", PRICE_PATH, { lineOfCodeRangeReference: spanning(2, 3) })

    expect(keysOf(waypointOn(priceOf), priceSource)).toStrictEqual(["block:ui-state:modified"])
    expect(keysOf(waypointOn(keep), ADDED_SOURCE)).toStrictEqual(["block:logic:modified"])
  })

  it("names a deleted root block by the classification of what was taken out", () => {
    const deleted = createCodeBlock("gone", PRICE_PATH, { type: "deleted", deletedType: "component", classifications: ["component"] })
    const unread = createCodeBlock("note", PRICE_PATH, { type: "deleted" })

    expect(keysOf(waypointOn(deleted, unread), priceSource)).toStrictEqual(["block:component:deleted", "block:logic:deleted"])
  })

  it("leaves imports out, added, changed or taken out", () => {
    const added = createCodeBlock("imports", PRICE_PATH, { type: "import", lineOfCodeRangeReference: spanning(1, 2) })
    const deleted = createCodeBlock("gone", PRICE_PATH, { type: "deleted", deletedType: "import" })

    expect(keysOf(waypointOn(added, deleted), ADDED_SOURCE)).toStrictEqual([])
  })

  it("climbs from a block inside to the root block around it, once for blocks that share it", () => {
    const root = createCodeBlock("total", PRICE_PATH, { lineOfCodeRangeReference: spanning(1, 2) })
    const inside = createCodeBlock("inside", PRICE_PATH, { type: "condition", parentBlock: root, isRoot: false })

    expect(keysOf(waypointOn(root, inside), ADDED_SOURCE)).toStrictEqual(["block:logic:added"])
  })
})

describe("rootBlockLabelOf", () => {
  it("names the classification of the root block, then what happened to it", () => {
    expect(rootBlockLabelOf("block:component:modified")).toBe("Component – Modified")
    expect(rootBlockLabelOf("block:database-read-write:added")).toBe("Database read/write – Added")
  })
})

describe("isRootBlockKey", () => {
  it("knows a key only for a classification and a root block change", () => {
    expect(isRootBlockKey("block:component:deleted")).toBe(true)
    expect(isRootBlockKey("block:component:removed")).toBe(false)
    expect(isRootBlockKey("block:hook:added")).toBe(false)
    expect(isRootBlockKey("block:component:added:more")).toBe(false)
    expect(isRootBlockKey("bug")).toBe(false)
  })
})
