import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ArtifactAmendment, ReviewKey } from "@/procedures/get-review/utils/review-store"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import { buildWriteUpRequestPrompt, toOneLine } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { NO_AGENT_MESSAGE } from "@/procedures/get-write-up-plan"
import { defaultWriterOf } from "@/procedures/get-write-up-plan/utils/default-writer"
import { externalStartMessage, sendToAgent } from "@/procedures/request-review"
import { planNodeWriteUp, type PlannedNodeWriteUp } from "./utils/plan-node-write-up"
import type { RequestWriteUpInput, WriteUpRequestResult } from "./utils/schemas"

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
  await sendToAgent(key, prompt, context)
  return { kind: "started", prompt: null, message }
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
  const writer = defaultWriterOf(setup.agents, LIVE_AGENTS)?.writer ?? null
  if (writer === null) return { kind: "rejected", field: "agent", message: NO_AGENT_MESSAGE }
  const planned = await context.reviewStore.amendArtifact(key, (artifact) => amendmentOf(planNodeWriteUp(artifact, input.target)))
  if (planned === null) return null
  if (planned.kind !== "planned") return planned
  return await handOver(key, writer, buildWriteUpRequestPrompt(repository, target, key, planned.ask), planned.message, context)
}
