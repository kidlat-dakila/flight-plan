import { changedHunksOf, coverCode } from "@/procedures/read-artifact/utils/covered-code"
import { DRAFT_ARTIFACT, SUBTOTAL_PATH } from "./artifact-fixture"

const { sources } = DRAFT_ARTIFACT

describe("coverCode", () => {
  it("returns a declaration's lines with their numbers and diff marks, removed lines included", () => {
    expect(coverCode(sources, SUBTOTAL_PATH, "lineTotal", 120)).toStrictEqual({
      path: SUBTOTAL_PATH,
      lineStart: 3,
      lineEnd: 4,
      change: "changed",
      text: " 3\tconst lineTotal = (sku: string, units: number): number =>\n-\t  Math.round(priceOf(sku) * units * 100) / 100\n+4\t  priceOf(sku) * units",
      omittedLineCount: 0,
    })
  })

  it("counts the lines past the limit instead of sending them", () => {
    expect(coverCode(sources, SUBTOTAL_PATH, "subtotal", 2)).toMatchObject({
      text: " 6\texport const subtotal = (cart: Cart): number =>\n+7\t  Math.round(",
      omittedLineCount: 2,
    })
  })

  it("returns nothing for a file or a declaration the artifact does not hold", () => {
    expect(coverCode(sources, "src/missing.ts", "subtotal", 120)).toBeNull()
    expect(coverCode(sources, SUBTOTAL_PATH, "toString", 120)).toBeNull()
  })
})

describe("changedHunksOf", () => {
  it("returns one block per group of changed lines", () => {
    const [subtotalSource] = sources.filter((source) => source.path === SUBTOTAL_PATH)

    expect(changedHunksOf(subtotalSource, 0)).toStrictEqual([
      "-\t  Math.round(priceOf(sku) * units * 100) / 100\n+4\t  priceOf(sku) * units",
      "+7\t  Math.round(\n+8\t    cart.lines.reduce((total, line) => total + lineTotal(line.sku, line.units), 0) * 100,\n+9\t  ) / 100",
    ])
  })

  it("adds the lines around a block, and joins blocks whose surrounding lines touch", () => {
    const [subtotalSource] = sources.filter((source) => source.path === SUBTOTAL_PATH)

    expect(changedHunksOf(subtotalSource, 1)).toStrictEqual([
      " 3\tconst lineTotal = (sku: string, units: number): number =>\n-\t  Math.round(priceOf(sku) * units * 100) / 100\n+4\t  priceOf(sku) * units\n 5\t\n 6\texport const subtotal = (cart: Cart): number =>\n+7\t  Math.round(\n+8\t    cart.lines.reduce((total, line) => total + lineTotal(line.sku, line.units), 0) * 100,\n+9\t  ) / 100",
    ])
  })
})
