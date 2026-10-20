import type { ArtifactAmendment } from "@/procedures/get-review/utils/review-store"
import { planNodeWriteUp } from "@/procedures/request-write-up/utils/plan-node-write-up"
import type { WriteUpTarget } from "@/procedures/request-write-up/utils/schemas"
import type { ReviewArtifact } from "@flightplan/configurations"

export interface QueuedWriteUps {
  readonly artifact: ReviewArtifact
  readonly asks: readonly string[]
}

const SEVERAL_ASKS_LEAD = "The reviewer asked for these write-ups while you were busy. Do each one as it asks:"

export const planQueuedWriteUps = (artifact: ReviewArtifact, targets: readonly WriteUpTarget[]): QueuedWriteUps =>
  targets.reduce<QueuedWriteUps>((queued, target) => {
    const planned = planNodeWriteUp(queued.artifact, target)
    return planned.kind === "planned" ? { artifact: planned.artifact, asks: [...queued.asks, planned.ask] } : queued
  }, { artifact, asks: [] })

export const queuedAmendmentOf = (queued: QueuedWriteUps): ArtifactAmendment<readonly string[]> => ({
  artifact: queued.asks.length === 0 ? null : queued.artifact,
  outcome: queued.asks,
})

export const queuedAskOf = (asks: readonly string[]): string =>
  asks.length === 1 ? asks[0] : [SEVERAL_ASKS_LEAD, ...asks.map((ask) => `- ${ask}`)].join("\n")
