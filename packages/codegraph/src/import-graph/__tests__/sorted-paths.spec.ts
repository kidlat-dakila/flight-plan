import { sortedPaths } from "@/import-graph/sorted-paths"

describe("sortedPaths", () => {
  it("orders paths the same way on every machine, capitals first", () => {
    expect(sortedPaths(["src/cart/lines.ts", "src/Checkout.vue", "src/cart/index.ts"])).toStrictEqual([
      "src/Checkout.vue",
      "src/cart/index.ts",
      "src/cart/lines.ts",
    ])
  })

  it("keeps each path once", () => {
    expect(sortedPaths(["src/cart.ts", "src/app.ts", "src/cart.ts"])).toStrictEqual(["src/app.ts", "src/cart.ts"])
  })

  it("leaves the paths it was given untouched", () => {
    const paths = ["src/cart.ts", "src/app.ts"]

    sortedPaths(paths)

    expect(paths).toStrictEqual(["src/cart.ts", "src/app.ts"])
  })
})
