import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import { NO_AGENT_MESSAGE } from "@/procedures/get-write-up-plan"
import { defaultWriterOf } from "@/procedures/get-write-up-plan/utils/default-writer"
import { findConfiguration } from "@/procedures/list-configurations/utils/configuration"
import { handToWriter } from "@/procedures/request-review"
import { planWriteUp } from "./utils/plan-write-up"
import type { WriteUpResult, WriteUpReviewInput } from "./utils/schemas"
import { scaffoldSegmentedAs } from "./utils/segmented-scaffold"

const NOTHING_LEFT_MESSAGE = "Everything you chose is already explained."

export const writeUpReview = async (input: WriteUpReviewInput, context: ProcedureContext): Promise<WriteUpResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [repositories, scaffold, setup, savedConfigurations] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.readScaffold(key),
    context.setupStore.read(),
    context.configurationStore.read(),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined || scaffold === null) return null
  const target = await findReviewTarget(repository, input.targetId, context)
  if (target === null) return null
  const planned = planWriteUp(input, {
    scaffold: await scaffoldSegmentedAs(scaffold, input.isSegmented, repository, context),
    configuration: findConfiguration(savedConfigurations, input.configurationId),
    writer: defaultWriterOf(setup.agents, LIVE_AGENTS)?.writer ?? null,
    noAgentMessage: NO_AGENT_MESSAGE,
    now: context.now(),
  })
  if (planned.kind === "rejected") return planned
  await context.reviewStore.writeScaffold(key, planned.scaffold)
  if (!planned.hasWork) return { kind: "written", message: NOTHING_LEFT_MESSAGE }
  return { kind: "started", ...await handToWriter({ key, repository, target, request: planned.scaffold.request }, context) }
}
