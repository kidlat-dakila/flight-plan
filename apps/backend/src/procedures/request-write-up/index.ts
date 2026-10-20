import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ArtifactAmendment, ReviewKey } from "@/procedures/get-review/utils/review-store"
import { buildWriteUpRequestPrompt, toOneLine } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { NO_AGENT_MESSAGE } from "@/procedures/get-write-up-plan"
import { defaultWriterOf } from "@/procedures/get-write-up-plan/utils/default-writer"
import { externalStartMessage, sendToAgent } from "@/procedures/request-review"
import { planNodeWriteUp, type PlannedNodeWriteUp } from "./utils/plan-node-write-up"
import type { RequestWriteUpInput, WriteUpRequestResult } from "./utils/schemas"

const QUEUED_MESSAGE = "The agent is still writing. If this is still missing when it finishes, Flight Plan asks for it next."

const unstartedMessage = (reason: string): string => `The agent did not start: ${reason}`

const amendmentOf = (planned: PlannedNodeWriteUp): ArtifactAmendment<PlannedNodeWriteUp> => ({
  artifact: planned.kind === "planned" ? planned.artifact : null,
  outcome: planned,
})

const writeWriter = async (key: ReviewKey, writer: ReviewWriter, context: ProcedureContext): Promise<void> => {
  const scaffold = await context.reviewStore.readScaffold(key)
  if (scaffold !== null) await context.reviewStore.writeScaffold(key, { ...scaffold, request: { ...scaffold.request, writer } })
}

const handOver = async (key: ReviewKey, writer: ReviewWriter, prompt: string, message: string, context: ProcedureContext): Promise<WriteUpRequestResult> => {
  if (writer.kind === "external") return { kind: "started", prompt: toOneLine(prompt), message: externalStartMessage(writer.agent) }
  await writeWriter(key, writer, context)
  const outcome = await sendToAgent(key, prompt, context)
  const isStarted = outcome.kind !== "failed" && outcome.kind !== "unavailable"
  return { kind: "started", prompt: null, message: isStarted ? message : unstartedMessage(outcome.reason) }
}

export const requestWriteUp = async (input: RequestWriteUpInput, context: ProcedureContext): Promise<WriteUpRequestResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [repositories, scaffold, setup] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.readScaffold(key),
    context.setupStore.read(),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined || scaffold === null) return null
  const target = await findReviewTarget(repository, input.targetId, context)
  if (target === null) return null
  const writer = defaultWriterOf(setup.agents, startableAgentsOf(context.conversationEnvironment.spawners))?.writer ?? null
  if (writer === null) return { kind: "rejected", field: "agent", message: NO_AGENT_MESSAGE }
  const planned = await context.reviewStore.amendArtifact(key, (artifact) => amendmentOf(planNodeWriteUp(artifact, input.target)))
  if (planned === null) return null
  if (planned.kind !== "planned") return planned
  const { agents, writeUpQueue } = context.conversationEnvironment
  if (writer.kind !== "external" && agents.find(key) !== null) {
    writeUpQueue.add(key, input.target)
    return { kind: "queued", message: QUEUED_MESSAGE }
  }
  return await handOver(key, writer, buildWriteUpRequestPrompt(repository, target, key, planned.ask), planned.message, context)
}
