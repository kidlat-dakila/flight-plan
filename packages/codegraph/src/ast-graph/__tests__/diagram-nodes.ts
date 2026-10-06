import type { DiagramNode, UsageKind } from "@/ast-graph"

const NO_RANGE = { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }

export const diagramNode = (file: string, name: string, callers: readonly DiagramNode[] = []): DiagramNode => ({
  id: { file, line: 1 },
  code: { file, name, definedAt: NO_RANGE, enclosingRange: NO_RANGE },
  callers,
})

export const usedBy = (caller: DiagramNode, via?: UsageKind): DiagramNode => ({
  ...caller,
  calledAt: NO_RANGE,
  ...(via === undefined ? {} : { via }),
})

const checkoutButton = diagramNode("src/ui.ts", "CheckoutButton")
const checkout = diagramNode("src/checkout.ts", "checkout", [usedBy(checkoutButton)])
const subtotal = diagramNode("src/cart.ts", "subtotal", [usedBy(checkout)])

export const PRICE_OF_TREE = diagramNode("src/pricing.ts", "priceOf", [usedBy(subtotal)])
export const CHECKOUT_TREE = checkout
export const LOGGER_TREE = diagramNode("src/logger.ts", "log")
