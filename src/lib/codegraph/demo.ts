/**
 * A self-contained demo of the whole diagram pipeline, over an in-memory repo.
 *
 * No git, no disk, no checkout — a literal set of files stands in for the repo,
 * so you can see exactly what the tracer produces. It wires the real pieces the
 * way production will: `moduleResolver` resolves the repo's imports, a word-scan stands in for the `git grep` candidate search, and
 * {@link buildDiagramTree} runs the per-file climb and merges the result.
 *
 * The sample is a small reach with a barrel in it:
 *
 *   priceOf  (src/pricing.ts, the change)
 *     ← subtotal   (src/cart.ts, imports priceOf through the src/index.ts barrel)
 *       ← checkout (src/checkout.ts, also changed → absorbed, keeps its steps)
 *         ← CheckoutButton (src/ui.ts, an entry point)
 *
 * Run it and write the JSON with:
 *   WRITE_DEMO=1 npx vitest run src/lib/codegraph/__tests__/demo.test.ts
 * which writes `src/lib/codegraph/demo.output.json`.
 */
import { buildDiagramTree, type ChangedFile } from "./buildDiagramTree"
import type { CallCandidates } from "./tracer/language"
import type { Repo } from "./tracer/typescript/index"
import { moduleResolver } from "./tracer/typescript/resolve"
import { typescriptTracer } from "./tracer/typescript/tracer"
import type { Diagram } from "./types"

/** The stand-in repository: file path → source. */
export const SAMPLE: Record<string, string> = {
  "src/pricing.ts": [
    "export function priceOf(item) {",
    "  if (item.onSale) {",
    "    return item.price * 0.9",
    "  }",
    "  return item.price",
    "}",
  ].join("\n"),

  // A barrel: `subtotal` reaches `priceOf` through this re-export, not directly.
  "src/index.ts": 'export * from "./pricing"',

  "src/cart.ts": [
    'import { priceOf } from "./index"',
    "export function subtotal(items) {",
    "  return items.reduce((sum, item) => sum + priceOf(item), 0)",
    "}",
  ].join("\n"),

  "src/checkout.ts": [
    'import { subtotal } from "./cart"',
    "export function checkout(cart) {",
    "  const total = subtotal(cart.items)",
    "  return total",
    "}",
  ].join("\n"),

  "src/ui.ts": [
    'import { checkout } from "./checkout"',
    "export function CheckoutButton(cart) {",
    "  return checkout(cart)",
    "}",
  ].join("\n"),
}

/** Two changed files: the sale branch in `priceOf`, and `checkout`'s body. */
export const SAMPLE_CHANGES: ChangedFile[] = [
  { path: "src/pricing.ts", changes: [[2, 3]] },
  { path: "src/checkout.ts", changes: [[3, 3]] },
]

/** Build the merged diagram for the sample (or any in-memory repo). */
export async function demoGraph(
  files: Record<string, string> = SAMPLE,
  changed: ChangedFile[] = SAMPLE_CHANGES,
): Promise<Diagram> {
  const names = new Set(Object.keys(files))
  const read = async (path: string): Promise<string | null> => files[path] ?? null

  const repo: Repo = {
    files: names,
    read,
    resolve: moduleResolver(names, read),
  }

  // The dumb stand-in for `git grep`: every file that writes the name as a word.
  const candidates: CallCandidates = async (target) => {
    const name = target.name.split(".").pop() ?? target.name
    const word = new RegExp(`\\b${name}\\b`)
    return Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path)
  }

  return buildDiagramTree({ files: changed, tracer: typescriptTracer, repo, candidates })
}
