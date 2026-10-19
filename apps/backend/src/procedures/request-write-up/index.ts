import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { buildWriteUpRequestPrompt, toOneLine } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { NO_AGENT_MESSAGE } from "@/procedures/get-write-up-plan"
import { defaultWriterOf } from "@/procedures/get-write-up-plan/utils/default-writer"
import { externalStartMessage, sendToAgent } from "@/procedures/request-review"
import { planNodeWriteUp } from "./utils/plan-node-write-up"
import type { RequestWriteUpInput, WriteUpRequestResult } from "./utils/schemas"

const unstartedMessage = (reason: string): string => `The agent did not start: ${reason}`

const handOver = async (key: ReviewKey, writer: ReviewWriter, prompt: string, message: string, context: ProcedureContext): Promise<WriteUpRequestResult> => {
  if (writer.kind === "external") return { kind: "started", prompt: toOneLine(prompt), message: externalStartMessage(writer.agent) }
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
  const planned = planNodeWriteUp(scaffold.artifact, input.target)
  if (planned.kind !== "planned") return planned
  await context.reviewStore.writeScaffold(key, { ...scaffold, artifact: planned.artifact, request: { ...scaffold.request, writer } })
  return await handOver(key, writer, buildWriteUpRequestPrompt(repository, target, key, planned.ask), planned.message, context)
}
