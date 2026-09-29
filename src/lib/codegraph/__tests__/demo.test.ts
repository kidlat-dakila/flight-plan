import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { demoGraph } from "../demo"

/**
 * Runs the whole pipeline over the in-memory sample and (with WRITE_DEMO=1)
 * writes the result to `src/lib/codegraph/demo.output.json` for inspection:
 *   WRITE_DEMO=1 npx vitest run src/lib/codegraph/__tests__/demo.test.ts
 * Without the env var it is a plain smoke test that the graph still builds.
 */
describe("demo graph", () => {
  it("builds the sample reach and (optionally) writes the JSON", async () => {
    const graph = await demoGraph()

    // The change resolves through the barrel to one connected tree.
    expect(graph).toHaveLength(1)
    expect(graph[0].code.name).toBe("priceOf")
    expect(graph[0].callers[0].code.name).toBe("subtotal")
    expect(graph[0].callers[0].callers[0].code.name).toBe("checkout")

    if (process.env.WRITE_DEMO) {
      const out = join(dirname(fileURLToPath(import.meta.url)), "..", "demo.output.json")
      writeFileSync(out, `${JSON.stringify(graph, null, 2)}\n`)
    }
  })
})
