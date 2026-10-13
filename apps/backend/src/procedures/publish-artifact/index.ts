import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent, type DeliveryOutcome } from "@/procedures/deliver-to-agent"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import type { Publication, PublishingRequest } from "@/procedures/get-review/utils/discussion"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { writePublishedCopy } from "@/procedures/write-published-copy"
import { ATTACHED_MESSAGE, descriptionUrlOf, withPublication } from "./utils/plan-publication"
import { publishingRequestOf } from "./utils/publishing-request"
import type { PublishArtifactInput } from "./utils/schemas"

interface PublishingReport {
  readonly message: string
}

const REQUESTED_MESSAGE = "Asked your agent to publish it. The link shows under Share when it is done."
const PAGE_NOT_BUILT_MESSAGE = "This build of Flight Plan has no page to publish."
const NO_AGENT_PREFIX = "No agent could be asked to publish it."

const reportOf = (outcome: DeliveryOutcome): PublishingReport =>
  outcome.kind === "unavailable" || outcome.kind === "failed"
    ? { message: `${NO_AGENT_PREFIX} ${outcome.reason}` }
    : { message: REQUESTED_MESSAGE }

const channelOf = (outcome: DeliveryOutcome): PublishingRequest["channel"] | null => {
  if (outcome.kind === "spawned" || outcome.kind === "agent-running") return "agent"
  return outcome.kind === "listener-waiting" ? "listener" : null
}

const requestOf = (outcome: DeliveryOutcome, requestedAt: Date): PublishingRequest | null => {
  const channel = channelOf(outcome)
  return channel === null ? null : { requestedAt, channel }
}

const attachToDescription = async (key: ReviewKey, context: ProcedureContext): Promise<PublishingReport | null> => {
  const [artifact, detail, publications] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readPublications(key),
  ])
  const url = artifact === null ? null : descriptionUrlOf(detail?.forgeUrl ?? null)
  if (url === null) return null
  await context.reviewStore.writePublications(key, withPublication(publications, { kind: "description", url, publishedAt: context.now() }))
  return { message: ATTACHED_MESSAGE }
}

const earlierClaudeUrlOf = (publications: readonly Publication[]): string | null =>
  publications.find((publication) => publication.kind === "claude")?.url ?? null

const requestClaudeArtifact = async (key: ReviewKey, context: ProcedureContext): Promise<PublishingReport | null> => {
  const [copy, publications] = await Promise.all([writePublishedCopy(key, context), context.reviewStore.readPublications(key)])
  if (copy.kind === "missing") return null
  if (copy.kind === "unbuilt") return { message: PAGE_NOT_BUILT_MESSAGE }
  const { files } = copy
  const { newId } = context.conversationEnvironment
  const requestedAt = context.now()
  await appendAndPublish(
    key,
    [{
      kind: "reviewer-message",
      id: newId(),
      body: publishingRequestOf(key, files, earlierClaudeUrlOf(publications)),
      reference: null,
      sentAt: requestedAt,
    }],
    context,
  )
  const outcome = await deliverToAgent(key, context)
  await context.reviewStore.writePublishingRequest(key, requestOf(outcome, requestedAt))
  return reportOf(outcome)
}

export const publishArtifact = async (input: PublishArtifactInput, context: ProcedureContext): Promise<PublishingReport | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  return input.destination === "claude" ? await requestClaudeArtifact(key, context) : await attachToDescription(key, context)
}
