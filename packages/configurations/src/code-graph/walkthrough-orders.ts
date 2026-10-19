export const WALKTHROUGH_ORDERS = ["imports-bottom-up", "imports-top-down", "important-first"] as const

export type WalkthroughOrder = (typeof WALKTHROUGH_ORDERS)[number]
