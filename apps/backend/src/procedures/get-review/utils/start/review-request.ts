import type { WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import type { AgentName, PresetName } from "@/procedures/get-setup/utils/setup"
import type { WalkthroughOrder as SortedWalkthroughOrder } from "@flightplan/configurations"

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
    | { readonly kind: "external", readonly agent: AgentName }
    | { readonly kind: "none" }
    | { readonly kind: "author", readonly start: AuthorStart }

export const isWrittenByAgent = (writer: ReviewWriter | null): boolean => writer?.kind === "agent" || writer?.kind === "external"

export interface WriteUpChoice {
  readonly sections: readonly WriteUpSection[]
  readonly walkthroughOrder: SortedWalkthroughOrder
}

export interface ReviewRequest {
  readonly configurationId: string
  readonly preset: PresetName
  readonly order: WalkthroughOrder
  readonly customOrder: string | null
  readonly writer: ReviewWriter
  readonly requestedAt: Date
  readonly writeUp?: WriteUpChoice | undefined
}
