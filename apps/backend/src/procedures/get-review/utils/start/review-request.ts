import type { AgentName, PresetName } from "@/procedures/get-setup/utils/setup"

export const WALKTHROUGH_ORDERS = [
  "foundations-first",
  "along-the-path",
  "core-change-first",
  "risk-first",
  "custom",
] as const

export type WalkthroughOrder = (typeof WALKTHROUGH_ORDERS)[number]

export const CUSTOM_ORDER: WalkthroughOrder = "custom"

export type ReviewWriter
  = | { readonly kind: "agent", readonly agent: AgentName, readonly model: string, readonly effort: string }
    | { readonly kind: "manual" }

export interface ReviewRequest {
  readonly preset: PresetName
  readonly order: WalkthroughOrder
  readonly customOrder: string | null
  readonly writer: ReviewWriter
  readonly requestedAt: Date
}
