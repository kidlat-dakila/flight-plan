import { listFilesFromRoots, type TracedFile } from "@/code-blocks/affected-diffs"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { codeOf, groupOf, rangeAt, sourcesOf, spanOf, type FixtureDiffs, type FixtureFiles } from "./group-fixture"

const PRICING = codeOf("export function priceOf(item) {", "  if (item.held > 0) {", "    return 0", "  }", "  return item.price", "}")
const CART = codeOf(
  "import { priceOf } from \"./pricing\"",
  "export function totalOf(items) {",
  "  return items.map((item) => priceOf(item))",
  "}",
  "export function countOf(items) {",
  "  return items.length",
  "}",
)
const PAGE = codeOf("import { totalOf } from \"./cart\"", "export function show(items) {", "  return totalOf(items)", "}")
const FILES: FixtureFiles = { "src/page.ts": PAGE, "src/cart.ts": CART, "src/pricing.ts": PRICING }
const HELD_CHANGE: FixtureDiffs = { "src/pricing.ts": [rangeAt(3, 5, 3, 13)] }

const EVEN = codeOf("import { isOdd } from \"./odd\"", "export function isEven(count) {", "  return count === 0 || isOdd(count - 1)", "}")
const ODD = codeOf("import { isEven } from \"./even\"", "export function isOdd(count) {", "  return count !== 0 && isEven(count - 1)", "}")
const LOOP: FixtureFiles = { "src/even.ts": EVEN, "src/odd.ts": ODD }

const diffsOf = (group: StoredCodeGroupGraph): string[] =>
  group.codeBlocks.flatMap((block) => block.diffs.map((diff) => [block.id, diff.type, spanOf(diff.range)].join(" ")))

const affectedOf = (files: FixtureFiles, diffs: FixtureDiffs): string[] =>
  diffsOf(groupOf(files, diffs)).filter((line) => line.includes(" affected "))

const chainOf = (length: number): TracedFile[] =>
  Array.from({ length }, (_unused, index) => ({
    filePath: `src/file-${String(index)}.ts`,
    importedFilePaths: new Map(index + 1 < length ? [["./next", `src/file-${String(index + 1)}.ts`]] : []),
  }))

describe("the order the files of a group are visited in", () => {
  it("visits a file after the file that imports it, from each file nothing imports", () => {
    expect(listFilesFromRoots(sourcesOf(FILES), groupOf(FILES).rootASTGraphFilePaths)).toStrictEqual(["src/page.ts", "src/cart.ts", "src/pricing.ts"])
  })

  it("visits a file two files import once", () => {
    const files = { "src/a.ts": "import \"./shared\"", "src/b.ts": "import \"./shared\"", "src/shared.ts": "export const one = 1" }

    expect(listFilesFromRoots(sourcesOf(files), ["src/a.ts", "src/b.ts"])).toStrictEqual(["src/a.ts", "src/b.ts", "src/shared.ts"])
  })

  it("visits the files of a loop of imports nothing else imports, though the group has no root file", () => {
    expect(groupOf(LOOP).rootASTGraphFilePaths).toStrictEqual([])
    expect(listFilesFromRoots(sourcesOf(LOOP), [])).toStrictEqual(["src/even.ts", "src/odd.ts"])
  })

  it("visits a loop beside a tree, and a file a root leads to through a loop", () => {
    const files = { "src/page.ts": "import \"./even\"", ...LOOP, "src/left.ts": "import \"./right\"", "src/right.ts": "import \"./left\"" }

    expect(listFilesFromRoots(sourcesOf(files), ["src/page.ts"])).toStrictEqual(["src/page.ts", "src/even.ts", "src/odd.ts", "src/left.ts", "src/right.ts"])
  })

  it("leaves out an import of a file outside the group and a root that is not in it", () => {
    const files: TracedFile[] = [{ filePath: "src/a.ts", importedFilePaths: new Map([["./gone", "src/gone.ts"]]) }]

    expect(listFilesFromRoots(files, ["src/a.ts", "src/other.ts"])).toStrictEqual(["src/a.ts"])
  })

  it("visits a long line of files that import each other, each once", () => {
    const length = 3000
    const visited = listFilesFromRoots(chainOf(length), ["src/file-0.ts"])

    expect([visited.length, visited[0], visited[length - 1]]).toStrictEqual([length, "src/file-0.ts", `src/file-${String(length - 1)}.ts`])
  })
})

describe("the affected diffs of a group", () => {
  it("marks the block that uses a block with a change inside it, where it uses it, and no block around or beyond it", () => {
    expect(diffsOf(groupOf(FILES, HELD_CHANGE))).toStrictEqual([
      "src/cart.ts#function@3:20 affected 3:30-3:37",
      "src/pricing.ts#condition@2:3 modified 3:5-3:13",
    ])
  })

  it("leaves the changes of a block as they are: an affected block is not a diff block", () => {
    const group = groupOf(FILES, HELD_CHANGE)

    expect(group.diffBlockIds).toStrictEqual(["src/pricing.ts#condition@2:3"])
    expect(group.codeBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id)).toStrictEqual(["src/pricing.ts#condition@2:3"])
  })

  it("keeps the own change of a block beside what affects it", () => {
    const group = groupOf(FILES, { ...HELD_CHANGE, "src/cart.ts": [rangeAt(3, 30, 3, 37)] })

    expect(diffsOf(group).filter((line) => line.startsWith("src/cart.ts"))).toStrictEqual([
      "src/cart.ts#function@3:20 modified 3:30-3:37",
      "src/cart.ts#function@3:20 affected 3:30-3:37",
    ])
  })

  it("marks a block of a loop of imports nothing else imports", () => {
    expect(affectedOf(LOOP, { "src/odd.ts": [rangeAt(3, 10, 3, 21)] })).toStrictEqual(["src/even.ts#function@2:1 affected 3:25-3:30"])
  })

  it("marks a block that uses a changed block of its own file", () => {
    const file = codeOf("function rateOf() {", "  return 2", "}", "export function priceOf(price) {", "  return price * rateOf()", "}")

    expect(affectedOf({ "src/price.ts": file }, { "src/price.ts": [rangeAt(2, 3, 2, 11)] })).toStrictEqual(["src/price.ts#function@4:1 affected 5:18-5:24"])
  })

  it("marks a method that calls a changed method of its class", () => {
    const file = codeOf("export class Order {", "  total() {", "    return 2", "  }", "  print() {", "    return this.total()", "  }", "}")

    expect(affectedOf({ "src/order.ts": file }, { "src/order.ts": [rangeAt(3, 5, 3, 13)] })).toStrictEqual(["src/order.ts#method@5:3 affected 6:12-6:22"])
  })

  it("marks a method that calls a changed method kept as a field, from inside a callback", () => {
    const file = codeOf("export class Order {", "  total = () => {", "    return 2", "  }", "  print() {", "    return [1].map(() => this.total())", "  }", "}")

    expect(affectedOf({ "src/order.ts": file }, { "src/order.ts": [rangeAt(3, 5, 3, 13)] })).toStrictEqual(["src/order.ts#function@6:20 affected 6:26-6:36"])
  })

  it("does not mark a function with a receiver of its own, and marks a read of a changed field", () => {
    const file = codeOf(
      "export class Order {",
      "  count = 2",
      "  total() {",
      "    return 2",
      "  }",
      "  print() {",
      "    return [function () { return this.total() }, this.count]",
      "  }",
      "}",
    )

    expect(affectedOf({ "src/order.ts": file }, { "src/order.ts": [rangeAt(4, 5, 4, 13)] })).toStrictEqual([])
    expect(affectedOf({ "src/order.ts": file }, { "src/order.ts": [rangeAt(2, 3, 2, 12)] })).toStrictEqual(["src/order.ts#method@6:3 affected 7:50-7:60"])
  })

  it("marks a method that calls a changed method of the class its class extends, through this and through super, and one that reads a member no class of it declares, and not one that calls an unchanged method of it", () => {
    const files = {
      "src/order.ts": codeOf(
        "import { Record } from \"./record\"",
        "export class Order extends Record {",
        "  print() {",
        "    return this.total()",
        "  }",
        "  save() {",
        "    return super.save()",
        "  }",
        "  name() {",
        "    return this.label",
        "  }",
        "}",
      ),
      "src/record.ts": codeOf("export class Record {", "  total() {", "    return 2", "  }", "  save() {", "    return 3", "  }", "}"),
    }

    expect(affectedOf(files, { "src/record.ts": [rangeAt(3, 5, 3, 13)] })).toStrictEqual([
      "src/order.ts#class@2:1 affected 2:28-2:34",
      "src/order.ts#method@3:3 affected 4:12-4:22",
      "src/order.ts#method@9:3 affected 10:12-10:22",
    ])
  })

  it("marks a block of a component that uses a changed function of that component", () => {
    const file = codeOf(
      "export const Form = () => {",
      "  const submit = () => {",
      "    return 2",
      "  }",
      "  return <form onSubmit={() => submit()} />",
      "}",
    )

    expect(affectedOf({ "src/form.tsx": file }, { "src/form.tsx": [rangeAt(3, 5, 3, 13)] })).toStrictEqual(["src/form.tsx#function@5:26 affected 5:32-5:38"])
  })

  it("does not mark a function that calls itself, nor a block that uses the function it is in", () => {
    const walk = codeOf("export function walk(node) {", "  if (node.next) {", "    return walk(node.next)", "  }", "  return 0", "}")

    expect(affectedOf({ "src/walk.ts": walk }, { "src/walk.ts": [rangeAt(5, 3, 5, 11)] })).toStrictEqual([])
    expect(affectedOf({ "src/walk.ts": walk }, { "src/walk.ts": [rangeAt(3, 5, 3, 27)] })).toStrictEqual([])
  })

  it("does not mark a block that reads an argument on a changed line", () => {
    const file = codeOf("export function priceOf(item) {", "  if (item.held > 0) {", "    return item.price - item.held", "  }", "  return item.price", "}")

    expect(affectedOf({ "src/pricing.ts": file }, { "src/pricing.ts": [rangeAt(3, 12, 3, 34)] })).toStrictEqual([])
  })

  it("does not mark the users of a block for a change written outside it, such as a comment above it", () => {
    const pricing = codeOf("// The price of one item", "export function priceOf(item) {", "  return 1", "}")
    const cart = codeOf("import { priceOf } from \"./pricing\"", "export const total = (item) => priceOf(item)")
    const group = groupOf({ "src/cart.ts": cart, "src/pricing.ts": pricing }, { "src/pricing.ts": [rangeAt(1, 1, 1, 25)] })

    expect(diffsOf(group)).toStrictEqual(["src/pricing.ts#function@2:1 modified 1:1-1:25"])
  })

  it("marks the user of a block that had lines taken out of it", () => {
    const pricing = codeOf("export function priceOf(item) {", "  return 1", "}")
    const cart = codeOf("import { priceOf } from \"./pricing\"", "export const total = (item) => priceOf(item)")

    expect(affectedOf({ "src/cart.ts": cart, "src/pricing.ts": pricing }, { "src/pricing.ts": [rangeAt(2, 1, 2, 1)] })).toStrictEqual(["src/cart.ts#function@2:1 affected 2:32-2:39"])
  })

  it("marks the user of a block it imports through a file that exports it again", () => {
    const files = {
      "src/cart.ts": codeOf("import { priceOf } from \"./index\"", "export const total = (item) => priceOf(item)"),
      "src/index.ts": "export { priceOf } from \"./pricing\"",
      "src/pricing.ts": codeOf("export function priceOf(item) {", "  return 1", "}"),
    }

    expect(affectedOf(files, { "src/pricing.ts": [rangeAt(2, 3, 2, 11)] })).toStrictEqual(["src/cart.ts#function@2:1 affected 2:32-2:39"])
  })

  it("marks the user of a changed member of an object, and not the user of another member of it", () => {
    const files = {
      "src/api.ts": codeOf("export const api = {", "  load: () => {", "    return 1", "  },", "  save: () => {", "    return 2", "  },", "}"),
      "src/page.ts": codeOf("import { api } from \"./api\"", "export const read = () => api.load()", "export const write = () => api.save()"),
    }

    expect(affectedOf(files, { "src/api.ts": [rangeAt(6, 5, 6, 13)] })).toStrictEqual(["src/page.ts#function@3:1 affected 3:28-3:36"])
  })

  it("marks a block that uses a changed type", () => {
    const files = {
      "src/item.ts": codeOf("export interface Item {", "  price: number", "}"),
      "src/pricing.ts": codeOf("import type { Item } from \"./item\"", "export const priceOf = (item: Item) => 1"),
    }

    expect(affectedOf(files, { "src/item.ts": [rangeAt(2, 3, 2, 16)] })).toStrictEqual(["src/pricing.ts#root-argument-value@2:25 affected 2:31-2:35"])
  })

  it("marks one use once, and each of two uses", () => {
    const cart = codeOf("import { priceOf } from \"./pricing\"", "export const total = (one, two) => priceOf(one) + priceOf(two)")
    const pricing = codeOf("export function priceOf(item) {", "  return 1", "}")

    expect(affectedOf({ "src/cart.ts": cart, "src/pricing.ts": pricing }, { "src/pricing.ts": [rangeAt(2, 3, 2, 11)] })).toStrictEqual(["src/cart.ts#function@2:1 affected 2:36-2:43", "src/cart.ts#function@2:1 affected 2:51-2:58"])
  })
})
