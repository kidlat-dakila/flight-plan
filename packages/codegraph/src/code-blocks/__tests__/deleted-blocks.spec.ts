import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import { diffsOf } from "@/code-blocks/patch-ranges"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { codeOf, sourcesOf, spanOf, type FixtureFiles } from "./group-fixture"

const CART = codeOf("import { keep } from \"./util\"", "export const total = () => keep()")
const UTIL = codeOf("export function keep() {", "  return 1", "}")
const ORDER = codeOf("export class Order {", "  print() {", "    return 1", "  }", "}")
const VIEW = codeOf("def keep():", "    return 1")

const groupWith = (files: FixtureFiles, patches: Readonly<Record<string, string>>): StoredCodeGroupGraph =>
  buildStoredCodeGroupGraph(sourcesOf(files).map((file) => ({ ...file, diffs: file.filePath in patches ? diffsOf(patches[file.filePath]) : [] })))

const diffsIn = (files: FixtureFiles, patches: Readonly<Record<string, string>>): string[] =>
  groupWith(files, patches).codeBlocks.flatMap((block) =>
    block.diffs.map((diff) => [block.type, block.name ?? "-", `in ${block.parentBlockId ?? "the file"}`, diff.type, spanOf(diff.range)].join(" ")))

describe("the deleted blocks of a group", () => {
  it("makes a block of its own of a function taken out above another, named after it, and leaves the function below and its users alone", () => {
    const patch = codeOf("@@ -1,4 +1,1 @@", "-export function old() {", "-  return 0", "-}", " export function keep() {")

    expect(diffsIn({ "src/cart.ts": CART, "src/util.ts": UTIL }, { "src/util.ts": patch })).toStrictEqual(["deleted old in the file deleted 1:1-1:1"])
  })

  it("puts the block in the file: among its blocks, at its root, and among the diff blocks", () => {
    const patch = codeOf("@@ -1,4 +1,1 @@", "-export function old() {", "-  return 0", "-}", " export function keep() {")
    const group = groupWith({ "src/util.ts": UTIL }, { "src/util.ts": patch })
    const [astGraph] = group.astGraphs

    expect([astGraph.codeBlockIds.includes("src/util.ts#deleted@1:1"), astGraph.rootBlockIds.includes("src/util.ts#deleted@1:1")]).toStrictEqual([true, true])
    expect([group.diffBlockIds, astGraph.diffBlockIds]).toStrictEqual([["src/util.ts#deleted@1:1"], ["src/util.ts#deleted@1:1"]])
  })

  it("makes a block of a comment, of a statement and of blank lines taken out at the root of a file", () => {
    const files = { "src/util.ts": UTIL }

    expect(diffsIn(files, { "src/util.ts": codeOf("@@ -1,2 +1,1 @@", "-// an old note", " export function keep() {") })).toStrictEqual(["deleted - in the file deleted 1:1-1:1"])
    expect(diffsIn(files, { "src/util.ts": codeOf("@@ -1,2 +1,1 @@", "-start()", " export function keep() {") })).toStrictEqual(["deleted - in the file deleted 1:1-1:1"])
    expect(diffsIn(files, { "src/util.ts": codeOf("@@ -1,2 +1,1 @@", "-", " export function keep() {") })).toStrictEqual(["deleted - in the file deleted 1:1-1:1"])
  })

  it("makes a block of a declaration taken out at the end of a file", () => {
    expect(diffsIn({ "src/util.ts": UTIL }, { "src/util.ts": codeOf("@@ -3,2 +3,1 @@", " }", "-export const gone = 1") })).toStrictEqual(["deleted gone in the file deleted 4:1-4:1"])
  })

  it("makes a block inside the block around it of a declaration taken out of that block", () => {
    const patch = codeOf("@@ -1,3 +1,2 @@", " export function keep() {", "-  const gone = 2", "   return 1")

    expect(diffsIn({ "src/util.ts": UTIL }, { "src/util.ts": patch })).toStrictEqual(["deleted gone in src/util.ts#function@1:1 deleted 2:1-2:1"])
  })

  it("makes a block inside a class of a method taken out of it, and none of the method below", () => {
    const patch = codeOf("@@ -1,5 +1,2 @@", " export class Order {", "-  total() {", "-    return 2", "-  }", "   print() {")
    const group = groupWith({ "src/order.ts": ORDER }, { "src/order.ts": patch })

    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": patch })).toStrictEqual(["deleted total in src/order.ts#class@1:1 deleted 2:1-2:1"])
    expect(group.codeBlocks.find((block) => block.type === "class")?.childrenBlockIds).toContain("src/order.ts#deleted@2:1")
  })

  it("keeps a statement taken out of a block on that block", () => {
    const patch = codeOf("@@ -1,3 +1,2 @@", " export function keep() {", "-  log()", "   return 1")

    expect(diffsIn({ "src/util.ts": UTIL }, { "src/util.ts": patch })).toStrictEqual(["function keep in the file deleted 2:1-2:1"])
  })

  it("keeps a decorator that was taken out on what it decorated", () => {
    const method = codeOf("@@ -1,3 +1,2 @@", " export class Order {", "-  @memo()", "   print() {")
    const view = codeOf("@@ -1,2 +1,1 @@", "-@login_required", " def keep():")

    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": method })).toStrictEqual(["method Order.print in src/order.ts#class@1:1 deleted 2:1-2:1"])
    expect(diffsIn({ "shop/views.py": VIEW }, { "shop/views.py": view })).toStrictEqual(["function keep in the file deleted 1:1-1:1"])
  })

  it("keeps a decorator written over several lines, and decorators with a comment between them, on what they decorated", () => {
    const options = codeOf("@@ -1,5 +1,2 @@", " export class Order {", "-  @memo({", "-    size: 2,", "-  })", "   print() {")
    const several = codeOf("@@ -1,5 +1,2 @@", " export class Order {", "-  @memo()", "-  // kept warm", "-  @traced()", "   print() {")
    const ofClass = codeOf("@@ -1,4 +1,1 @@", "-@Entity({", "-  name: \"orders\",", "-})", " export class Order {")
    const view = codeOf("@@ -1,4 +1,1 @@", "-@route(", "-    \"/orders\",", "-)", " def keep():")

    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": options })).toStrictEqual(["method Order.print in src/order.ts#class@1:1 deleted 2:1-2:1"])
    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": several })).toStrictEqual(["method Order.print in src/order.ts#class@1:1 deleted 2:1-2:1"])
    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": ofClass })).toStrictEqual(["class Order in the file deleted 1:1-1:1"])
    expect(diffsIn({ "shop/views.py": VIEW }, { "shop/views.py": view })).toStrictEqual(["function keep in the file deleted 1:1-1:1"])
  })

  it("makes a block of a method taken out with its decorator, named after the method, and of a decorated class taken out whole", () => {
    const method = codeOf("@@ -1,6 +1,2 @@", " export class Order {", "-  @memo()", "-  total() {", "-    return 2", "-  }", "   print() {")
    const ofClass = codeOf("@@ -1,3 +1,1 @@", "-@Entity()", "-export class Old {}", " export class Order {")

    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": method })).toStrictEqual(["deleted total in src/order.ts#class@1:1 deleted 2:1-2:1"])
    expect(diffsIn({ "src/order.ts": ORDER }, { "src/order.ts": ofClass })).toStrictEqual(["deleted Old in the file deleted 1:1-1:1"])
  })

  it("makes a block of a Python function taken out above another", () => {
    const patch = codeOf("@@ -1,4 +1,1 @@", "-def old():", "-    return 0", "-", " def keep():")

    expect(diffsIn({ "shop/views.py": VIEW }, { "shop/views.py": patch })).toStrictEqual(["deleted old in the file deleted 1:1-1:1"])
  })

  it("keeps lines that do not stand alone as code on the block they were taken out of", () => {
    const patch = codeOf("@@ -1,3 +1,2 @@", " export function keep() {", "-  if (ready) {", "   return 1")

    expect(diffsIn({ "src/util.ts": UTIL }, { "src/util.ts": patch })).toStrictEqual(["function keep in the file deleted 2:1-2:1"])
  })

  it("keeps a deletion in a file no language reads on the block of that file", () => {
    const patch = codeOf("@@ -1,2 +1,1 @@", "-drop table a;", " create table b;")

    expect(diffsIn({ "schema.sql": "create table b;" }, { "schema.sql": patch })).toStrictEqual(["file - in the file deleted 1:1-1:1"])
  })

  it("traces no chain through a deleted block", () => {
    const patch = codeOf("@@ -1,4 +1,1 @@", "-export function old() {", "-  return 0", "-}", " export function keep() {")
    const group = groupWith({ "src/cart.ts": CART, "src/util.ts": UTIL }, { "src/util.ts": patch })

    expect(group.diffChainIds).toStrictEqual([])
    expect(group.codeBlocks.flatMap((block) => block.nextBlockIds)).toStrictEqual([])
  })
})
