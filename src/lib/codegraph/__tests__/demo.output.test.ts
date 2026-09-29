import { it } from "vitest"
import { demoGraph } from "../demo"

/**
 * Prints the raw diagram JSON for the built-in sample, so you can eyeball the
 * output shape:  npx vitest run src/lib/codegraph/__tests__/demo.output.test.ts
 */
it("prints the demo graph as raw JSON", async () => {
  const graph = await demoGraph()
  console.log(JSON.stringify(graph, null, 2))
})
