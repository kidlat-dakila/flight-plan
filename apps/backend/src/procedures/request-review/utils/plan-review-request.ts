import type { AgentOffer } from "@/procedures/get-review/utils/start/agent-offers"
import { CUSTOM_ORDER, type ReviewRequest, type ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import type { RequestReviewInput, RequestReviewResult } from "./schemas"

export type PlannedReviewRequest
  = | { readonly kind: "planned", readonly request: ReviewRequest, readonly configuration: Configuration }
    | Extract<RequestReviewResult, { kind: "rejected" }>

type Rejection = Extract<RequestReviewResult, { kind: "rejected" }>

const reject = (field: Rejection["field"], message: string): Rejection => ({ kind: "rejected", field, message })

const customOrderOf = (input: RequestReviewInput): string | null =>
  input.order === CUSTOM_ORDER ? input.customOrder.trim() : null

type WriterPlan
  = | { readonly kind: "planned", readonly writer: ReviewWriter }
    | Rejection

type AgentChoice = Extract<RequestReviewInput["writer"], { kind: "agent" }>

const planStartedAgent = (choice: AgentChoice, offer: AgentOffer): WriterPlan => {
  const model = offer.models.find((candidate) => candidate.model === choice.model)
  if (model === undefined) return reject("model", `${offer.label} does not offer this model.`)
  return model.efforts.some((effort) => effort.effort === choice.effort)
    ? { kind: "planned", writer: choice }
    : reject("effort", `${model.label} does not offer this effort.`)
}

const planWriter = (writer: RequestReviewInput["writer"], offers: readonly AgentOffer[]): WriterPlan => {
  if (writer.kind !== "agent") return { kind: "planned", writer }
  const offer = offers.find((candidate) => candidate.agent === writer.agent)
  if (offer === undefined) return reject("writer", "This agent is not set up in Flight Plan.")
  return offer.isStartable ? planStartedAgent(writer, offer) : { kind: "planned", writer: { kind: "external", agent: offer.agent } }
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
  const writerPlan = planWriter(input.writer, offers)
  if (writerPlan.kind === "rejected") return writerPlan
  return {
    kind: "planned",
    configuration,
    request: {
      configurationId: configuration.id,
      preset: configuration.preset,
      order: input.order,
      customOrder,
      writer: writerPlan.writer,
      requestedAt: now,
    },
  }
}
