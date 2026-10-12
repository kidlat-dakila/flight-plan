import { compareRanges } from "@/code-blocks/source-range"
import { omit } from "@/shared/record"
import { blockNamed, codeOf, groupOf, rangeAt, symbolsOf } from "./group-fixture"

describe("the outer symbols of a block", () => {
  it("holds a name declared outside the block and each block declared inside it, a variable among them", () => {
    const group = groupOf({
      "src/users.ts": codeOf("export const removeUser = (id, attempts) => id"),
      "src/page.ts": codeOf("import { removeUser } from \"./users\"", "const MAX = 3", "const handleDelete = (id) => {", "  const label = \"user\"", "  const attempts = MAX", "  removeUser(id, attempts, label)", "}"),
    })

    expect(symbolsOf(blockNamed(group, "function", "handleDelete"))).toStrictEqual([])
    expect(symbolsOf(blockNamed(group, "call", "removeUser"))).toStrictEqual([
      "call external-block src/users.ts#function@1:1",
      "value internal-code-block src/page.ts#root-argument-value@3:23",
      "value internal-code-block src/page.ts#external-value@5:3",
      "value internal-code-block src/page.ts#variable@4:3",
    ])
    expect(symbolsOf(blockNamed(group, "external-value", "attempts"))).toStrictEqual(["value internal-code-block src/page.ts#root-variable@2:1"])
  })

  it("holds a symbol in the innermost block around the use, one per use", () => {
    const group = groupOf({ "src/page.ts": codeOf("const save = () => 1", "function run(a) {", "  save()", "  if (a) { save() }", "}") })

    expect(symbolsOf(blockNamed(group, "function", "run"))).toStrictEqual([])
    expect(group.codeBlocks.filter((block) => block.type === "condition").flatMap(symbolsOf)).toStrictEqual(["value internal-code-block src/page.ts#root-argument-value@2:14"])
    expect(group.codeBlocks.filter((block) => block.type === "call").map((block) => [block.parentBlockId, symbolsOf(block)])).toStrictEqual([
      ["src/page.ts#function@2:1", ["call internal-code-block src/page.ts#function@1:1"]],
      ["src/page.ts#condition@4:3", ["call internal-code-block src/page.ts#function@1:1"]],
    ])
  })

  it("says how each name is used: called, rendered, handed over, read by a member or named as a type", () => {
    const group = groupOf({
      "src/page.tsx": codeOf(
        "import { save, SaveButton, query, type User } from \"lib\"",
        "const Page = (): User => {",
        "  save()",
        "  new save()",
        "  return <SaveButton onSave={save} label={query.data} />",
        "}",
      ),
    })

    expect(group.codeBlocks.flatMap(symbolsOf)).toStrictEqual([
      "type unopened-import lib:User",
      "call unopened-import lib:save",
      "call unopened-import lib:save",
      "render unopened-import lib:SaveButton",
      "read unopened-import lib:query data",
      "value unopened-import lib:save",
    ])
  })

  it("points at a variable of the same file that is not a block by the range of its declaration", () => {
    const group = groupOf({ "src/page.ts": codeOf("declare const limit: number", "function run() {", "  if (limit) {}", "}") })

    const [symbol] = group.codeBlocks.filter((block) => block.type === "condition").flatMap((block) => block.outerSymbols)

    expect(symbol).toStrictEqual({ usedAt: rangeAt(3, 7, 3, 12), use: "value", handedToId: null, type: "internal-variable", lineOfCodeReference: rangeAt(1, 15, 1, 20) })
  })

  it("keeps what the import statement says of a name the group cannot open", () => {
    const group = groupOf({
      "src/page.ts": codeOf("import React, { useQuery as useQ } from \"lib\"", "import { formatDate } from \"../shared/dates\"", "const run = () => [useQ(), React.useEffect(), formatDate()]"),
    })

    expect(blockNamed(group, "function", "run").outerSymbols.map((symbol) => omit({ ...symbol }, "usedAt"))).toStrictEqual([
      { use: "call", type: "unopened-import", specifier: "lib", importedName: "useQuery", isLibrary: true },
      { use: "call", member: { path: ["useEffect"], blockId: null }, type: "unopened-import", specifier: "lib", importedName: "default", isLibrary: true },
      { use: "call", type: "unopened-import", specifier: "../shared/dates", importedName: "formatDate", isLibrary: true },
    ])
  })

  it("leads a name of a namespace import to the block the other file exports under that name", () => {
    const group = groupOf({
      "src/users.ts": codeOf("export const removeUser = () => 1"),
      "src/page.ts": codeOf("import * as users from \"./users\"", "const run = () => users.removeUser()"),
    })

    expect(symbolsOf(blockNamed(group, "function", "run"))).toStrictEqual(["call external-block src/users.ts#function@1:1"])
  })

  it("makes no symbol of a global", () => {
    const group = groupOf({ "src/page.ts": codeOf("const run = () => setTimeout(document.title)") })

    expect(group.codeBlocks.flatMap(symbolsOf)).toStrictEqual([])
  })
})

describe("what a handed-over value is handed to", () => {
  const files = {
    "src/save-button.tsx": codeOf(
      "export function SaveButton({ onSave }) {",
      "  return <button onClick={onSave}>Save</button>",
      "}",
      "export function LegacyButton(props) {",
      "  return <button onClick={props.onSave}>Save</button>",
      "}",
      "export const run = (task, label) => task()",
    ),
    "src/review-page.tsx": codeOf(
      "import { LegacyButton, SaveButton, run } from \"./save-button\"",
      "const saveReview = () => 1",
      "const title = \"Save\"",
      "export const ReviewPage = () => <><SaveButton onSave={saveReview} /><LegacyButton onSave={saveReview} title={title} /></>",
      "run(saveReview, title)",
    ),
  }

  it("hands a value to the argument block of that prop, when the component takes its argument apart", () => {
    const group = groupOf(files)
    const [event] = group.codeBlocks.filter((block) => block.type === "render-event" && block.name === "onSave")

    expect(event.outerSymbols.map((symbol) => symbol.handedToId)).toStrictEqual(["src/save-button.tsx#root-argument-value@1:30"])
    expect(blockNamed(group, "root-argument-value", "onSave").handedFrom).toStrictEqual([{ blockId: event.id, symbolIndex: 0 }])
  })

  it("hands a value to the block of the member, when the component reads it from its argument", () => {
    const group = groupOf(files)
    const [, event] = group.codeBlocks.filter((block) => block.type === "render-event" && block.name === "onSave")

    expect(event.outerSymbols.map((symbol) => symbol.handedToId)).toStrictEqual(["src/save-button.tsx#root-argument-value@5:27"])
  })

  it("hands a value to nothing when the component does not read that prop, or is not of the repository", () => {
    const group = groupOf(files)
    const title = group.codeBlocks.flatMap((block) => block.outerSymbols).filter((symbol) => symbol.usedAt.start.line === 4 && symbol.usedAt.start.column > 100)
    const builtIn = group.codeBlocks.filter((block) => block.type === "render-event" && block.name === "onClick").flatMap((block) => block.outerSymbols)

    expect(title.map((symbol) => symbol.handedToId)).toStrictEqual([null])
    expect(builtIn.map((symbol) => symbol.handedToId)).toStrictEqual([null, undefined])
  })

  it("hands an argument of a call to the argument block at that position", () => {
    const group = groupOf(files)
    const passed = group.codeBlocks.flatMap((block) => block.outerSymbols).filter((symbol) => symbol.usedAt.start.line === 5 && symbol.use === "value")

    expect(passed.map((symbol) => [symbol.usedAt.start.column, symbol.handedToId])).toStrictEqual([
      [17, "src/save-button.tsx#root-argument-value@7:27"],
      [5, "src/save-button.tsx#root-argument-value@7:21"],
    ])
  })

  it("says what is done with a member apart from which member it is", () => {
    const group = groupOf({ "src/button.tsx": codeOf("function SaveButton(props) {", "  props.onSave()", "  return <props.Icon label={props.label} />", "}") })

    const symbols = [...group.codeBlocks.flatMap((block) => block.outerSymbols)].sort((one, two) => compareRanges(one.usedAt, two.usedAt))

    expect(symbols.map((symbol) => [symbol.use, symbol.member])).toStrictEqual([
      ["call", { path: ["onSave"], blockId: "src/button.tsx#root-argument-value@2:3" }],
      ["render", { path: ["Icon"], blockId: "src/button.tsx#root-argument-value@3:11" }],
      ["read", { path: ["label"], blockId: "src/button.tsx#root-argument-value@3:29" }],
    ])
  })

  it("hands a member that is passed on to the argument block that receives it", () => {
    const group = groupOf({
      "src/button.tsx": codeOf("export function SaveButton({ onSave }) {", "  return <button onClick={onSave} />", "}", "export function Toolbar(props) {", "  return <SaveButton onSave={props.onSave} />", "}"),
    })
    const [, passedOn] = group.codeBlocks.filter((block) => block.type === "render-event").flatMap((block) => block.outerSymbols)

    expect([passedOn.use, passedOn.handedToId]).toStrictEqual(["read", "src/button.tsx#root-argument-value@1:30"])
  })

  it("says which member is taken, with its block when the member is read from an argument", () => {
    const group = groupOf(files)
    const [onClick] = group.codeBlocks.filter((block) => block.type === "render-event" && block.name === "onClick" && block.filePath === "src/save-button.tsx").slice(1)

    expect(onClick.outerSymbols.map((symbol) => symbol.member)).toStrictEqual([{ path: ["onSave"], blockId: "src/save-button.tsx#root-argument-value@5:27" }])
  })
})

describe("the names a file exports", () => {
  const group = groupOf({
    "src/pricing/price-of.ts": codeOf("export default function priceOf(item) {}", "const RATE = 2", "export { RATE as rate }", "export const [low, high] = [1, 2]"),
    "src/pricing/tax-of.ts": codeOf("export default () => 1", "export type Tax = number"),
    "src/pricing/index.ts": codeOf("export { default as price } from \"./price-of\"", "export { default as tax } from \"./tax-of\"", "export * from \"./price-of\"", "export { useQuery } from \"lib\""),
    "src/cart.ts": codeOf("import { price, rate } from \"./pricing\"", "export const total = () => price(rate)"),
  })
  const exportsOf = (filePath: string): unknown => group.astGraphs.find((astGraph) => astGraph.filePath === filePath)?.exports

  it("leads each exported name to its block, under the name it is exported by", () => {
    expect(exportsOf("src/pricing/price-of.ts")).toStrictEqual({
      default: "src/pricing/price-of.ts#function@1:1",
      low: "src/pricing/price-of.ts#root-variable@4:1",
      high: "src/pricing/price-of.ts#root-variable@4:1",
      rate: "src/pricing/price-of.ts#root-variable@2:1",
    })
    expect(exportsOf("src/pricing/tax-of.ts")).toStrictEqual({ Tax: "src/pricing/tax-of.ts#type-declaration@2:1", default: "src/pricing/tax-of.ts#function@1:1" })
  })

  it("leads a re-exported name to the block of the file that declares it, and passes on every name but default", () => {
    expect(exportsOf("src/pricing/index.ts")).toStrictEqual({
      price: "src/pricing/price-of.ts#function@1:1",
      tax: "src/pricing/tax-of.ts#function@1:1",
      low: "src/pricing/price-of.ts#root-variable@4:1",
      high: "src/pricing/price-of.ts#root-variable@4:1",
      rate: "src/pricing/price-of.ts#root-variable@2:1",
    })
  })

  it("says on a block which files export it", () => {
    const priceOf = blockNamed(group, "function", "priceOf")

    expect([priceOf.isExported, priceOf.exportedByFilePaths]).toStrictEqual([true, ["src/pricing/price-of.ts", "src/pricing/index.ts"]])
    expect([blockNamed(group, "root-argument-value", "item").isExported, blockNamed(group, "root-argument-value", "item").exportedByFilePaths]).toStrictEqual([false, []])
  })

  it("turns an import into the block behind the name, through the file that re-exports it", () => {
    expect(symbolsOf(blockNamed(group, "function", "total"))).toStrictEqual([
      "call external-block src/pricing/price-of.ts#function@1:1",
      "value external-block src/pricing/price-of.ts#root-variable@2:1",
    ])
  })

  it("lists on a block the blocks that use it, and on a file what its blocks take from other files", () => {
    const cart = group.astGraphs.find((astGraph) => astGraph.filePath === "src/cart.ts")

    expect(blockNamed(group, "function", "priceOf").usedByIds).toStrictEqual(["src/cart.ts#function@2:1"])
    expect(cart?.externalBlockIds).toStrictEqual(["src/pricing/price-of.ts#function@1:1", "src/pricing/price-of.ts#root-variable@2:1"])
    expect(cart?.externalSymbols).toStrictEqual([
      { blockId: "src/cart.ts#function@2:1", symbolIndex: 0 },
      { blockId: "src/cart.ts#function@2:1", symbolIndex: 1 },
    ])
  })
})
