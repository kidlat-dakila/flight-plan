import { describe, expect, it } from "vitest"
import { buildDiagramTree } from "../buildDiagramTree"
import type { CallCandidates } from "../tracer/typescript/callGraph"
import { typescriptTracer } from "../tracer/typescript/tracer"
import type { Repo } from "../tracer/typescript/index"
import { moduleResolver } from "../tracer/typescript/resolve"

function harness(files: Record<string, string>) {
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => files[one] ?? null
  const repo: Repo = { files: names, read, resolve: moduleResolver(names, read) }
  const candidates: CallCandidates = async (target) => {
    const name = target.name.split(".").pop() ?? target.name
    const word = new RegExp(`\\b${name}\\b`)
    return Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path)
  }
  return { repo, candidates }
}

describe("buildDiagramTree (multi-file entry)", () => {
  it("merges two changed files into one connected tree", async () => {
    const files = {
      "src/pricing.ts": ["export function priceOf() {", "  return 1", "}"].join("\n"),
      "src/checkout.ts": [
        'import { priceOf } from "./pricing"',
        "export function checkout() {",
        "  return priceOf()",
        "}",
      ].join("\n"),
    }
    const { repo, candidates } = harness(files)

    const diagram = await buildDiagramTree({
      files: [
        { path: "src/pricing.ts", changes: [[2, 2]] },
        { path: "src/checkout.ts", changes: [[3, 3]] },
      ],
      tracer: typescriptTracer,
      repo,
      candidates,
    })

    // priceOf is the deepest change → sole root; checkout is absorbed as its
    // caller, still carrying its own execution steps.
    expect(diagram).toHaveLength(1)
    expect(diagram[0].code.name).toBe("priceOf")
    expect(diagram[0].callers[0].code.name).toBe("checkout")
    expect(diagram[0].callers[0].executionSteps?.length ?? 0).toBeGreaterThan(0)
  })

  it("follows a handoff into a child when values is set (call-only otherwise)", async () => {
    const files = {
      "src/pricing.ts": ["export function priceOf() {", "  return 1", "}"].join("\n"),
      "src/Parent.tsx": [
        'import { priceOf } from "./pricing"',
        'import { Child } from "./Child"',
        "export function Parent() { return <Child submit={priceOf} /> }",
      ].join("\n"),
      "src/Child.tsx": "export function Child({ submit }) { submit(); return null }",
    }
    const { repo, candidates } = harness(files)
    const input = {
      files: [{ path: "src/pricing.ts", changes: [[2, 2]] as [number, number][] }],
      tracer: typescriptTracer,
      repo,
      candidates,
    }

    // Call-only: priceOf is only handed off as a value, so nothing calls it.
    const callOnly = await buildDiagramTree(input)
    expect(callOnly[0].callers).toEqual([])

    // Value-flow: the child that fires the callback is reached, by a value edge.
    const withValues = await buildDiagramTree({ ...input, values: true })
    const child = withValues[0].callers.find((one) => one.code.name === "Child")
    expect(child?.via).toBe("value")
  })
})
