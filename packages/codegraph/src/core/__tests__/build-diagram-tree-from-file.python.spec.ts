import { describe, expect, it } from "vitest"
import { buildDiagramTreeFromFile } from "@/core/build-diagram-tree-from-file"
import type { PyRepo } from "@/core/tracer/python/index"
import { pythonTracer } from "@/core/tracer/python/tracer"

function harness(files: Record<string, string>) {
  const repo: PyRepo = {
    files: new Set(Object.keys(files)),
    read: async (p) => await Promise.resolve(files[p] ?? null),
    rootsFor: async () => await Promise.resolve([""]),
  }
  const candidates = async (t: { name: string }) => {
    const name = t.name.slice(t.name.lastIndexOf(".") + 1)
    const word = new RegExp(`\\b${name}\\b`)
    return await Promise.resolve(Object.entries(files).filter(([, text]) => word.test(text)).map(([p]) => p))
  }
  return { repo, candidates }
}

describe("buildDiagramTreeFromFile (python)", () => {
  it("roots at the changed function, climbs its caller, fills steps", async () => {
    const files = {
      "pkg/__init__.py": "",
      "pkg/pricing.py": "def price_of():\n    return 1\n",
      "pkg/checkout.py": "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
    }
    const { repo, candidates } = harness(files)
    const diagram = await buildDiagramTreeFromFile({
      tracer: pythonTracer,
      path: "pkg/pricing.py",
      changes: [[2, 2]],
      repo,
      candidates,
    })
    expect(diagram).toHaveLength(1)
    expect(diagram[0].code.name).toBe("price_of")
    expect(diagram[0].callers[0].code).toMatchObject({ name: "checkout", file: "pkg/checkout.py" })
    expect(diagram[0].executionSteps?.length ?? 0).toBeGreaterThan(0)
  })

  it("returns empty when the change touches no function", async () => {
    const { repo, candidates } = harness({ "pkg/const.py": "RATE = 1\nOTHER = 2\n" })
    const diagram = await buildDiagramTreeFromFile({
      tracer: pythonTracer,
      path: "pkg/const.py",
      changes: [[1, 1]],
      repo,
      candidates,
    })
    expect(diagram).toStrictEqual([])
  })
})
