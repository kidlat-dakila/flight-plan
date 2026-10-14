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

export const AUTHOR_STARTS = ["scaffold", "empty"] as const

export type AuthorStart = (typeof AUTHOR_STARTS)[number]

export type ReviewWriter
  = | { readonly kind: "agent", readonly agent: AgentName, readonly model: string, readonly effort: string }
    | { readonly kind: "manual" }
    | { readonly kind: "author", readonly start: AuthorStart }

export interface ReviewRequest {
  readonly configurationId: string
  readonly preset: PresetName
  readonly order: WalkthroughOrder
  readonly customOrder: string | null
  readonly writer: ReviewWriter
  readonly requestedAt: Date
}
