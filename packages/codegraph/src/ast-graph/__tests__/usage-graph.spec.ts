import { usageNodeIdOf } from "@/ast-graph"

describe("usageNodeIdOf", () => {
  it("names a declaration by its file and its name", () => {
    expect(usageNodeIdOf("src/pricing.ts", "Cart.total")).toBe("src/pricing.ts#Cart.total")
  })
})
