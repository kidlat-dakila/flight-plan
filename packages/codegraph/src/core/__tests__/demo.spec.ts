import { describe, expect, it } from "vitest"
import { demoGraph } from "@/core/demo"

describe("demo graph", () => {
  it("builds the sample reach", async () => {
    const graph = await demoGraph()

    expect(graph).toHaveLength(1)
    expect(graph[0].code.name).toBe("priceOf")
    expect(graph[0].callers[0].code.name).toBe("subtotal")
    expect(graph[0].callers[0].callers[0].code.name).toBe("checkout")
  })
})
