import { describe, expect, it } from "vitest"
import { buildMultiLanguageDiagram } from "../buildMultiLanguageDiagram"
import type { RepoBase } from "../tracer/languages"

describe("buildMultiLanguageDiagram", () => {
  it("dispatches ts and py files to their own tracers and merges the forests", async () => {
    const files: Record<string, string> = {
      // typescript half
      "src/pricing.ts": "export function priceOf() { return 1 }",
      "src/checkout.ts": 'import { priceOf } from "./pricing"\nexport function checkout() { return priceOf() }',
      // python half
      "pkg/__init__.py": "",
      "pkg/pricing.py": "def price_of():\n    return 1\n",
      "pkg/checkout.py": "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
    }
    const base: RepoBase = { files: new Set(Object.keys(files)), read: async (p) => files[p] ?? null }
    const candidates = async (t: { name: string }) => {
      const name = t.name.split(".").pop() ?? t.name
      const word = new RegExp(`\\b${name}\\b`)
      return Object.entries(files).filter(([, text]) => word.test(text)).map(([p]) => p)
    }
    const diagram = await buildMultiLanguageDiagram({
      base,
      candidates,
      files: [
        { path: "src/pricing.ts", changes: [[1, 1]] },
        { path: "pkg/pricing.py", changes: [[1, 1]] },
      ],
    })
    const roots = diagram.map((n) => `${n.code.file}:${n.code.name}`).sort()
    expect(roots).toEqual(["pkg/pricing.py:price_of", "src/pricing.ts:priceOf"])
    // no cross-language edge: the ts root's callers are all .ts, the py root's all .py
    const ts = diagram.find((n) => n.code.file.endsWith(".ts"))!
    const py = diagram.find((n) => n.code.file.endsWith(".py"))!
    expect(ts.callers.every((c) => c.code.file.endsWith(".ts"))).toBe(true)
    expect(py.callers.every((c) => c.code.file.endsWith(".py"))).toBe(true)
  })
})
