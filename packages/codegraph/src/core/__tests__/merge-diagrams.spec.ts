import { describe, expect, it } from "vitest"
import { buildDiagramTreeFromFile } from "@/core/build-diagram-tree-from-file"
import { mergeDiagrams } from "@/core/merge-diagrams"
import type { CallCandidates } from "@/core/tracer/typescript/call-graph"
import type { Repo } from "@/core/tracer/typescript/index"
import { moduleResolver } from "@/core/tracer/typescript/resolve"
import { typescriptTracer } from "@/core/tracer/typescript/tracer"
import type { CodeRef, DiagramNode, Range } from "@/core/types"

const span = (from: number, to: number): Range => ({
  start: { line: from, column: 0 },
  end: { line: to, column: 0 },
})
const codeRef = (file: string, name: string, from: number, to: number): CodeRef => ({
  file,
  name,
  definedAt: span(from, from),
  enclosingRange: span(from, to),
})

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

describe("mergeDiagrams over tracer output", () => {
  it("joins two changes on the shared symbol and absorbs the changed caller", async () => {
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

    const a = await buildDiagramTreeFromFile({ tracer: typescriptTracer, path: "src/pricing.ts", changes: [[2, 2]], repo, candidates })
    const b = await buildDiagramTreeFromFile({ tracer: typescriptTracer, path: "src/checkout.ts", changes: [[3, 3]], repo, candidates })

    const merged = mergeDiagrams([a, b])

    expect(merged).toHaveLength(1)
    expect(merged[0].code.name).toBe("priceOf")
    expect(merged[0].callers[0].code.name).toBe("checkout")
    expect(merged[0].callers[0].executionSteps?.length ?? 0).toBeGreaterThan(0)
  })

  it("preserves a value handoff edge and an escape marker through the merge", () => {
    const change = codeRef("a.ts", "priceOf", 1, 3)
    const child = codeRef("b.tsx", "Child", 1, 3)
    const tree: DiagramNode = {
      id: { file: "a.ts", line: 1 },
      code: change,
      executionSteps: [],
      callers: [
        { id: { file: "b.tsx", line: 1 }, code: child, via: "value", calledAt: span(2, 2), callers: [] },
        {
          id: { file: "a.ts", line: 5 },
          code: codeRef("a.ts", "escapes: spread", 5, 5),
          via: "value",
          escape: { reason: "spread", at: span(5, 5) },
          callers: [],
        },
      ],
    }

    const merged = mergeDiagrams([[tree]])

    expect(merged).toHaveLength(1)
    expect(merged[0].code.name).toBe("priceOf")
    const handoff = merged[0].callers.find((one) => one.code.name === "Child")
    expect(handoff?.via).toBe("value")
    const marker = merged[0].callers.find((one) => one.escape !== undefined)
    expect(marker?.escape?.reason).toBe("spread")
    expect(marker?.via).toBe("value")
  })
})
