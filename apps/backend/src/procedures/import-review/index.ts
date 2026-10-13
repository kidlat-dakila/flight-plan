import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent, type DeliveryOutcome } from "@/procedures/deliver-to-agent"
import { appendAndPublish, findReviewTarget } from "@/procedures/get-conversation/utils/conversation-actions"
import { isClaudeArtifactUrl } from "@/procedures/record-publication/utils/claude-artifact-url"
import { fetchingRequestOf } from "./utils/fetching-request"
import { importIdOf, isImportUnderway, type ImportRequest } from "./utils/import-request"
import type { ImportReviewInput, ReviewImport } from "./utils/schemas"

const NOT_AN_ARTIFACT_MESSAGE = "That is not the address of a Claude artifact."
const STARTED_MESSAGE = "Asked your agent to fetch the Flight Plan."
const NO_AGENT_PREFIX = "No agent could be asked to fetch it."

const channelOf = (outcome: DeliveryOutcome): ImportRequest["channel"] | null => {
  if (outcome.kind === "spawned" || outcome.kind === "agent-running") return "agent"
  return outcome.kind === "listener-waiting" ? "listener" : null
}

const refused = (message: string): ReviewImport => ({ importId: null, message })

const started = (request: ImportRequest): ReviewImport => ({ importId: importIdOf(request), message: STARTED_MESSAGE })

const reasonOf = (outcome: DeliveryOutcome): string =>
  outcome.kind === "unavailable" || outcome.kind === "failed" ? `${NO_AGENT_PREFIX} ${outcome.reason}` : NO_AGENT_PREFIX

export const importReview = async (input: ImportReviewInput, context: ProcedureContext): Promise<ReviewImport> => {
  if (!isClaudeArtifactUrl(input.artifactUrl)) return refused(NOT_AN_ARTIFACT_MESSAGE)
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return refused(target.message)
  const requestedAt = context.now()
  const underway = await context.reviewStore.readImportRequest(key)
  const isAgentRunning = context.conversationEnvironment.agents.find(key) !== null
  if (underway !== null && isImportUnderway(underway, isAgentRunning, requestedAt)) return started(underway)
  await appendAndPublish(
    key,
    [{
      kind: "reviewer-message",
      id: context.conversationEnvironment.newId(),
      body: fetchingRequestOf(key, input.artifactUrl, context.importFiles.pathOf(key)),
      reference: null,
      sentAt: requestedAt,
    }],
    context,
  )
  const outcome = await deliverToAgent(key, context)
  const channel = channelOf(outcome)
  if (channel === null) return refused(reasonOf(outcome))
  const request: ImportRequest = { artifactUrl: input.artifactUrl, channel, requestedAt, importedAt: null }
  await context.reviewStore.writeImportRequest(key, request)
  return started(request)
}
