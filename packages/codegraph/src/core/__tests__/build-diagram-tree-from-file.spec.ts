import { describe, expect, it } from "vitest"
import { buildDiagramTreeFromFile } from "@/core/build-diagram-tree-from-file"
import type { CallCandidates } from "@/core/tracer/typescript/call-graph"
import type { Repo } from "@/core/tracer/typescript/index"
import { moduleResolver } from "@/core/tracer/typescript/resolve"
import { typescriptTracer } from "@/core/tracer/typescript/tracer"

function harness(files: Record<string, string>) {
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => await Promise.resolve(files[one] ?? null)
  const repo: Repo = { files: names, read, resolve: moduleResolver(names, read) }
  const candidates: CallCandidates = async (target) => {
    const name = target.name.slice(target.name.lastIndexOf(".") + 1)
    const word = new RegExp(`\\b${name}\\b`)
    return await Promise.resolve(Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path))
  }
  return { repo, candidates }
}

describe("buildDiagramTreeFromFile", () => {
  it("roots at the changed function, climbs its caller, and fills execution steps", async () => {
    const files = {
      "src/pricing.ts": ["export function priceOf() {", "  return 1", "}"].join("\n"),
      "src/checkout.ts": [
        "import { priceOf } from \"./pricing\"",
        "export function checkout() {",
        "  return priceOf()",
        "}",
      ].join("\n"),
    }
    const { repo, candidates } = harness(files)

    const diagram = await buildDiagramTreeFromFile({
      tracer: typescriptTracer,
      path: "src/pricing.ts",
      changes: [[2, 2]],
      repo,
      candidates,
    })

    expect(diagram).toHaveLength(1)
    expect(diagram[0].code.name).toBe("priceOf")
    expect(diagram[0].callers[0].code).toMatchObject({ name: "checkout", file: "src/checkout.ts" })
    expect(diagram[0].executionSteps?.length ?? 0).toBeGreaterThan(0)
    expect(diagram[0].callers[0].executionSteps).toBeUndefined()
  })

  it("gives a changed line to the tightest function holding it, and climbs out through the one that holds that", async () => {
    const files = {
      "src/BasketForm.tsx": [
        "export function BasketForm({ submit }) {",
        "  const onSubmit = () => {",
        "    if (valid()) {",
        "      submit()",
        "    }",
        "  }",
        "  return <form onSubmit={onSubmit} />",
        "}",
        "function valid() { return true }",
      ].join("\n"),
    }
    const { repo, candidates } = harness(files)

    const inner = await buildDiagramTreeFromFile({ tracer: typescriptTracer, path: "src/BasketForm.tsx", changes: [[4, 4]], repo, candidates })
    expect(inner.map((root) => root.code.name)).toStrictEqual(["BasketForm.onSubmit"])
    expect(inner[0].callers.map((one) => one.code.name)).toStrictEqual(["BasketForm"])

    const outer = await buildDiagramTreeFromFile({ tracer: typescriptTracer, path: "src/BasketForm.tsx", changes: [[7, 7]], repo, candidates })
    expect(outer.map((root) => root.code.name)).toStrictEqual(["BasketForm"])
    expect((outer[0].executionSteps ?? []).filter((step) => step.changed).map((step) => step.line)).toStrictEqual([7])
  })

  it("returns an empty diagram when the change touches no function", async () => {
    const files = { "src/pricing.ts": ["const rate = 1", "const other = 2"].join("\n") }
    const { repo, candidates } = harness(files)
    const diagram = await buildDiagramTreeFromFile({
      tracer: typescriptTracer,
      path: "src/pricing.ts",
      changes: [[1, 1]],
      repo,
      candidates,
    })
    expect(diagram).toStrictEqual([])
  })
})
