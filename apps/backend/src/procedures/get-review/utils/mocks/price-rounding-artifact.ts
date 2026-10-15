import { parseMarkedSource } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"

const SUBTOTAL_PATH = "src/cart/subtotal.ts"

const SUBTOTAL = [
  " import type { Cart } from \"./cart\"",
  " import { priceOf } from \"../catalog/price\"",
  " ",
  " const CENTS_PER_UNIT = 100",
  " ",
  "#region lineTotal",
  " const lineTotal = (sku: string, units: number): number =>",
  "-  Math.round(priceOf(sku) * units * CENTS_PER_UNIT) / CENTS_PER_UNIT",
  "+  priceOf(sku) * units",
  "#endregion lineTotal",
  " ",
  "#region subtotal",
  " export const subtotal = (cart: Cart): number =>",
  "-  cart.lines.reduce((total, line) => total + lineTotal(line.sku, line.units), 0)",
  "+  Math.round(",
  "+    cart.lines.reduce((total, line) => total + lineTotal(line.sku, line.units), 0) * CENTS_PER_UNIT,",
  "+  ) / CENTS_PER_UNIT",
  "#endregion subtotal",
].join("\n")

export const PRICE_ROUNDING_ARTIFACT: ReviewArtifact = {
  title: "Move price rounding into the cart total",
  status: "complete",
  commit: "c81e220",
  isSegmented: false,
  segments: [
    {
      id: "all",
      title: "Move price rounding into the cart total",
      changedPaths: [SUBTOTAL_PATH],
      context: [
        "A cart with many lines could be a cent off the sum a customer adds up by hand, because each line was rounded before the lines were added. This change rounds once, at the end.",
        "",
        "## Overview",
        "",
        "- **When** a cart holds three lines that each end in a third of a cent, **then** the total is rounded once, and matches the sum of the unrounded lines.",
        "",
        "## Implementation",
        "",
        "**`src/cart/subtotal.ts`**",
        "",
        "- Removes the rounding from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
        "- Rounds the sum in [`subtotal()`](code:src/cart/subtotal.ts#subtotal).",
      ].join("\n"),
      journey: null,
      blast: null,
      walkthrough: {
        files: [
          {
            path: SUBTOTAL_PATH,
            waypoints: [
              {
                id: "line-total",
                title: "A line total is no longer rounded",
                declaration: "lineTotal",
                codeBlocks: [],
                reading: "The function now returns the exact product. Anything that shows a single line's total would show the unrounded number, and nothing outside this file calls it.",
                needsAttention: null,
                findings: [],
                children: [],
              },
              {
                id: "subtotal",
                title: "The sum is rounded once",
                declaration: "subtotal",
                codeBlocks: [],
                reading: "The rounding moved here unchanged: multiply by a hundred, round, divide by a hundred.",
                needsAttention: null,
                findings: [
                  {
                    id: "float-sum",
                    kind: "nit",
                    title: "The sum is still a floating point number",
                    reading: "Adding prices as floats and rounding at the end is better than rounding each line, and counting in cents would remove the question altogether.",
                    trace: null,
                    solution: null,
                  },
                ],
                children: [],
              },
            ],
          },
        ],
      },
    },
  ],
  sources: [parseMarkedSource(SUBTOTAL_PATH, "typescript", SUBTOTAL)],
  contextCodeBlocks: [],
  changedPaths: [SUBTOTAL_PATH],
}
