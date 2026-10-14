import type { AgentOffer } from "@/procedures/get-review/utils/start/agent-offers"
import { CUSTOM_ORDER, type ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import type { RequestReviewInput, RequestReviewResult } from "./schemas"

export type PlannedReviewRequest
  = | { readonly kind: "planned", readonly request: ReviewRequest, readonly configuration: Configuration }
    | Extract<RequestReviewResult, { kind: "rejected" }>

type Rejection = Extract<RequestReviewResult, { kind: "rejected" }>

const reject = (field: Rejection["field"], message: string): Rejection => ({ kind: "rejected", field, message })

const customOrderOf = (input: RequestReviewInput): string | null =>
  input.order === CUSTOM_ORDER ? input.customOrder.trim() : null

const writerProblemOf = (writer: RequestReviewInput["writer"], offers: readonly AgentOffer[]): Rejection | null => {
  if (writer.kind !== "agent") return null
  const offer = offers.find((candidate) => candidate.agent === writer.agent)
  if (offer === undefined) return reject("writer", "This agent is not set up in Flight Plan.")
  if (offer.unavailableReason !== null) return reject("writer", offer.unavailableReason)
  const model = offer.models.find((candidate) => candidate.model === writer.model)
  if (model === undefined) return reject("model", `${offer.label} does not offer this model.`)
  return model.efforts.some((effort) => effort.effort === writer.effort)
    ? null
    : reject("effort", `${model.label} does not offer this effort.`)
}

export const MISSING_CONFIGURATION_MESSAGE = "This configuration no longer exists. Pick another one."

export const planReviewRequest = (
  input: RequestReviewInput,
  configuration: Configuration | null,
  offers: readonly AgentOffer[],
  now: Date,
): PlannedReviewRequest => {
  if (input.targetId.trim() === "") return reject("target", "Choose a pull request or a branch.")
  if (configuration === null) return reject("configuration", MISSING_CONFIGURATION_MESSAGE)
  const customOrder = customOrderOf(input)
  if (customOrder === "") return reject("customOrder", "Write how the agent orders the Code Walkthrough.")
  return writerProblemOf(input.writer, offers) ?? {
    kind: "planned",
    configuration,
    request: {
      configurationId: configuration.id,
      preset: configuration.preset,
      order: input.order,
      customOrder,
      writer: input.writer,
      requestedAt: now,
    },
  }
}
