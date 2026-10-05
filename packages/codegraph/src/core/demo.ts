import { buildDiagramTree, type ChangedFile } from "./build-diagram-tree"
import type { CallCandidates } from "./tracer/language"
import type { Repo } from "./tracer/typescript"
import { moduleResolver } from "./tracer/typescript/resolve"
import { typescriptTracer } from "./tracer/typescript/tracer"
import type { Diagram } from "./types"

export const SAMPLE: Record<string, string> = {
  "src/pricing.ts": [
    "export function priceOf(item) {",
    "  if (item.onSale) {",
    "    return item.price * 0.9",
    "  }",
    "  return item.price",
    "}",
  ].join("\n"),

  "src/index.ts": "export * from \"./pricing\"",

  "src/cart.ts": [
    "import { priceOf } from \"./index\"",
    "export function subtotal(items) {",
    "  return items.reduce((sum, item) => sum + priceOf(item), 0)",
    "}",
  ].join("\n"),

  "src/checkout.ts": [
    "import { subtotal } from \"./cart\"",
    "export function checkout(cart) {",
    "  const total = subtotal(cart.items)",
    "  return total",
    "}",
  ].join("\n"),

  "src/ui.ts": [
    "import { checkout } from \"./checkout\"",
    "export function CheckoutButton(cart) {",
    "  return checkout(cart)",
    "}",
  ].join("\n"),
}

const SALE_BRANCH_FIRST_LINE = 2
const SALE_BRANCH_LAST_LINE = 3
const CHECKOUT_TOTAL_LINE = 3

export const SAMPLE_CHANGES: ChangedFile[] = [
  { path: "src/pricing.ts", changes: [[SALE_BRANCH_FIRST_LINE, SALE_BRANCH_LAST_LINE]] },
  { path: "src/checkout.ts", changes: [[CHECKOUT_TOTAL_LINE, CHECKOUT_TOTAL_LINE]] },
]

export async function demoGraph(
  files: Record<string, string> = SAMPLE,
  changed: ChangedFile[] = SAMPLE_CHANGES,
): Promise<Diagram> {
  const names = new Set(Object.keys(files))
  const read = async (path: string): Promise<string | null> => await Promise.resolve(files[path] ?? null)

  const repo: Repo = {
    files: names,
    read,
    resolve: moduleResolver(names, read),
  }

  const candidates: CallCandidates = async (target) => {
    const name = target.name.slice(target.name.lastIndexOf(".") + 1)
    const word = new RegExp(`\\b${name}\\b`)
    const mentioning = Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path)
    return await Promise.resolve(mentioning)
  }

  return buildDiagramTree({ files: changed, tracer: typescriptTracer, repo, candidates })
}
