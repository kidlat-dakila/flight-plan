import type { WalkthroughOrder } from "./review-request"

export interface WalkthroughOrderOffer {
  readonly label: string
  readonly summary: string
  readonly description: string
  readonly instruction: string | null
}

export const DEFAULT_ORDER: WalkthroughOrder = "foundations-first"

export const WALKTHROUGH_ORDER_OFFERS: Record<WalkthroughOrder, WalkthroughOrderOffer> = {
  "foundations-first": {
    label: "Foundations first",
    summary: "Definitions before the code that uses them.",
    description:
      "The deepest code first: types and helpers, then the code that calls them, then the wiring. A name is defined before it is used.",
    instruction:
      "Order the Code Walkthrough foundations first: the deepest changed code, then the code that calls it, then the wiring and configuration.",
  },
  "along-the-path": {
    label: "Along the path",
    summary: "The order the change runs in.",
    description:
      "The entry point first, then each file the change reaches in turn, in the order the Trace Diagram reads.",
    instruction:
      "Order the Code Walkthrough along the path: the file where control arrives first, then each file the change reaches in turn.",
  },
  "core-change-first": {
    label: "Core change first",
    summary: "The point of the change before its consequences.",
    description:
      "The files that are the point of the change first, then what supports them, then the callers that had to follow.",
    instruction:
      "Order the Code Walkthrough core change first: the files that are the point of the change, then the code that supports them, then the callers that had to follow.",
  },
  "risk-first": {
    label: "Risk first",
    summary: "What needs the most attention before what is safe to skim.",
    description: "The files that need the most attention first, down to the ones that are safe to skim.",
    instruction:
      "Order the Code Walkthrough risk first: the files whose waypoints need the most attention, down to the ones that are safe to skim.",
  },
  "custom": {
    label: "Custom",
    summary: "Your own instruction for the order.",
    description: "The agent orders the walkthrough by the instruction you write under this choice.",
    instruction: null,
  },
}

export const orderInstructionOf = (order: WalkthroughOrder, customOrder: string | null): string =>
  WALKTHROUGH_ORDER_OFFERS[order].instruction
  ?? `Order the Code Walkthrough as the reviewer asks: ${customOrder ?? ""}`

export const orderSummaryOf = (order: WalkthroughOrder, customOrder: string | null): string =>
  customOrder ?? WALKTHROUGH_ORDER_OFFERS[order].label
