import type { DiffKind, SourceRange } from "@/code-blocks/types"
import { codeOf, groupOf, rangeAt } from "./group-fixture"

const PAGE = codeOf(
  "import { priceOf } from \"./price\"",
  "type Props = { items: number[] }",
  "const sync = () => 1",
  "export const Page = ({ items }: Props) => {",
  "  watch(() => sync())",
  "  const total = items.length > 3 ? 1 : 2",
  "  return <button onClick={() => priceOf(total)}>Pay</button>",
  "}",
  "bus.on(\"paid\", () => sync())",
)
const PRICE = codeOf("export const priceOf = (total) => {", "  if (total > 3) { return 1 }", "  return run(() => 2)", "}")

const containsOf = (pageRanges: readonly SourceRange[], priceRanges: readonly SourceRange[] = []): readonly DiffKind[] =>
  groupOf({ "src/page.tsx": PAGE, "src/price.ts": PRICE }, { "src/page.tsx": pageRanges, "src/price.ts": priceRanges }).diffContains

describe("what the diff of a group contains", () => {
  it("says ui for a change in markup", () => {
    expect(containsOf([rangeAt(7, 49, 7, 52)])).toStrictEqual(["ui"])
  })

  it("says ui for a change in any block inside a function that has a render-root", () => {
    expect(containsOf([rangeAt(6, 17, 6, 22)])).toStrictEqual(["ui"])
    expect(containsOf([rangeAt(4, 14, 4, 18)])).toStrictEqual(["ui"])
  })

  it("says logic for a change in a function, a condition or a loop outside a component", () => {
    expect(containsOf([], [rangeAt(2, 7, 2, 12)])).toStrictEqual(["logic"])
    expect(containsOf([rangeAt(3, 20, 3, 21)])).toStrictEqual(["logic"])
  })

  it("says effect for a change in an effect or in one of its callbacks, beside ui inside a component", () => {
    expect(containsOf([], [rangeAt(3, 10, 3, 13)])).toStrictEqual(["effect"])
    expect(containsOf([rangeAt(5, 3, 5, 8)])).toStrictEqual(["ui", "effect"])
  })

  it("says event for a change in a code-event", () => {
    expect(containsOf([rangeAt(9, 1, 9, 4)])).toStrictEqual(["event"])
  })

  it("says type for a change in a type-declaration and logic for a change in an import", () => {
    expect(containsOf([rangeAt(2, 6, 2, 11)])).toStrictEqual(["type"])
    expect(containsOf([rangeAt(1, 10, 1, 17)])).toStrictEqual(["logic"])
  })

  it("says file for a change in a file no language reads", () => {
    expect(groupOf({ "schema.prisma": "model Order {}" }, { "schema.prisma": [rangeAt(1, 7, 1, 12)] }).diffContains).toStrictEqual(["file"])
  })

  it("says data for a change in a data-fetch", () => {
    const group = groupOf({ "src/orders.ts": codeOf("export const loadOrders = () => fetch(\"/api/orders\")") }, { "src/orders.ts": [rangeAt(1, 39, 1, 52)] })

    expect(group.diffContains).toStrictEqual(["data"])
  })

  it("says for each file what its own changes hold", () => {
    const group = groupOf({ "src/page.tsx": PAGE, "src/price.ts": PRICE }, { "src/page.tsx": [rangeAt(7, 49, 7, 52)], "src/price.ts": [rangeAt(3, 10, 3, 13)] })

    expect(group.astGraphs.map((astGraph) => [astGraph.filePath, astGraph.diffContains])).toStrictEqual([
      ["src/page.tsx", ["ui"]],
      ["src/price.ts", ["effect"]],
    ])
    expect(group.diffContains).toStrictEqual(["ui", "effect"])
  })

  it("lists each kind once, in a fixed order", () => {
    expect(containsOf([rangeAt(2, 6, 2, 11), rangeAt(7, 49, 7, 52), rangeAt(6, 17, 6, 22)], [rangeAt(2, 7, 2, 12), rangeAt(3, 10, 3, 13)])).toStrictEqual([
      "ui",
      "effect",
      "type",
      "logic",
    ])
  })
})
