import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { codeOf, groupOf, rangeAt, spanOf } from "./group-fixture"

const diffsOf = (group: StoredCodeGroupGraph): string[] =>
  group.codeBlocks
    .filter((block) => block.lineOfCodeDiffs !== null)
    .map((block) => [block.type, ...(block.name === undefined ? [] : [block.name]), (block.lineOfCodeDiffs ?? []).map(spanOf).join(" ")].join(" "))

const BUTTON = codeOf("const Row = ({ id, isBusy }) => (", "  <button onClick={() => remove(id)} disabled={isBusy ? true : false} />", ")")

describe("the diff blocks of a group", () => {
  it("places a change in the innermost block that contains its range, and in no block around it", () => {
    const group = groupOf({ "src/row.tsx": BUTTON }, { "src/row.tsx": [rangeAt(2, 26, 2, 36)] })

    expect(diffsOf(group)).toStrictEqual(["function 2:26-2:36"])
    expect(group.diffBlockIds).toStrictEqual(["src/row.tsx#function@2:20"])
    expect(group.astGraphs[0].diffBlockIds).toStrictEqual(["src/row.tsx#function@2:20"])
  })

  it("tells two blocks on one line apart by their columns", () => {
    const group = groupOf({ "src/row.tsx": BUTTON }, { "src/row.tsx": [rangeAt(2, 57, 2, 61)] })

    expect(diffsOf(group)).toStrictEqual(["condition 2:57-2:61"])
  })

  it("places a change in the block around it when no block inside holds the range", () => {
    const check = codeOf("function check() {", "  const a = 1", "  if (b > 2) {", "    notify()", "  }", "}")

    expect(diffsOf(groupOf({ "src/check.ts": check }, { "src/check.ts": [rangeAt(1, 10, 1, 15)] }))).toStrictEqual(["function check 1:10-1:15"])
    expect(diffsOf(groupOf({ "src/check.ts": check }, { "src/check.ts": [rangeAt(2, 3, 2, 14)] }))).toStrictEqual(["variable a 2:3-2:14"])
    expect(diffsOf(groupOf({ "src/check.ts": check }, { "src/check.ts": [rangeAt(3, 3, 3, 15)] }))).toStrictEqual(["condition 3:3-3:15"])
  })

  it("marks each innermost block a range touches when the range crosses the edge of a block", () => {
    const group = groupOf({ "src/row.tsx": BUTTON }, { "src/row.tsx": [rangeAt(2, 3, 2, 73)] })

    expect(diffsOf(group)).toStrictEqual([
      "render button 2:3-2:11 2:37-2:48 2:69-2:73",
      "render-event onClick 2:11-2:20 2:36-2:37",
      "function 2:20-2:36",
      "condition 2:48-2:69",
    ])
  })

  it("places a position with no width in the innermost block around that position", () => {
    const group = groupOf({ "src/row.tsx": BUTTON }, { "src/row.tsx": [rangeAt(2, 30, 2, 30), rangeAt(3, 1, 3, 1)] })

    expect(diffsOf(group)).toStrictEqual(["render-root 3:1-3:1", "function 2:30-2:30"])
  })

  it("places a change in an import, a type and a statement at the root of a file, each in a block of its own", () => {
    const file = codeOf("import { a } from \"./a\"", "type Id = string", "start(a)")
    const group = groupOf({ "src/main.ts": file }, { "src/main.ts": [rangeAt(1, 10, 1, 11), rangeAt(2, 11, 2, 17), rangeAt(3, 1, 3, 9)] })

    expect(diffsOf(group)).toStrictEqual(["import 1:10-1:11", "type-declaration Id 2:11-2:17", "root-statement 3:1-3:9"])
  })

  it("places a change outside every block in the block that follows it, or in the last block of the file", () => {
    const file = codeOf("// the price of an item", "const priceOf = () => 1", "", "// the end")
    const group = groupOf({ "src/price.ts": file }, { "src/price.ts": [rangeAt(1, 1, 1, 24), rangeAt(4, 1, 4, 11)] })

    expect(diffsOf(group)).toStrictEqual(["function priceOf 1:1-1:24 4:1-4:11"])
  })

  it("places a change to a member read from an argument in the block of that member", () => {
    const file = codeOf("function SaveButton(props) {", "  return <button onClick={props.onSave} />", "}")
    const group = groupOf({ "src/button.tsx": file }, { "src/button.tsx": [rangeAt(2, 33, 2, 39)] })

    expect(diffsOf(group)).toStrictEqual(["root-argument-value onSave 2:33-2:39"])
  })

  it("places every change of a file no language reads in its one file block", () => {
    const group = groupOf({ "migrations/0042.sql": codeOf("alter table orders", "  add column status text;") }, { "migrations/0042.sql": [rangeAt(2, 3, 2, 26)] })

    expect(group.codeBlocks.map((block) => [block.id, block.lineOfCodeRangeReference.map(spanOf), block.lineOfCodeDiffs?.map(spanOf)])).toStrictEqual([
      ["migrations/0042.sql#file@1:1", ["1:1-2:26"], ["2:3-2:26"]],
    ])
  })

  it("leaves every block of a file without changes unmarked", () => {
    const group = groupOf({ "src/row.tsx": BUTTON })

    expect([diffsOf(group), group.diffBlockIds, group.diffContains]).toStrictEqual([[], [], []])
  })
})
