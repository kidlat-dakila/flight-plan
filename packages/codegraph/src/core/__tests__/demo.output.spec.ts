import { expect, it } from "vitest"
import { demoGraph } from "@/core/demo"

it("builds the recorded demo graph", async () => {
  const graph = await demoGraph()

  await expect(`${JSON.stringify(graph, null, 2)}\n`).toMatchFileSnapshot("../demo.output.json")
})
