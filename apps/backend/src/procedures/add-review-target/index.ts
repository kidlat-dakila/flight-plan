import type { ProcedureContext } from "@/procedures/context"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { readAddableTargets } from "@/procedures/search-addable-targets/utils/read-addable-targets"
import { findAddableTarget } from "@/procedures/search-addable-targets/utils/select-addable-targets"
import type { AddReviewTargetInput, ReviewTargetAddition } from "./utils/schemas"

const GONE_TARGET_MESSAGE = "This branch is no longer in the repository."

export const addReviewTarget = async (
  input: AddReviewTargetInput,
  context: ProcedureContext,
): Promise<ReviewTargetAddition | null> => {
  const [registered, setup] = await Promise.all([context.repositoryStore.listRegistered(), context.setupStore.read()])
  const repository = registered.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const reading = await readAddableTargets(repository, setup.forges, context.openRepository)
  if (reading.kind === "unreadable") return { kind: "unavailable", message: reading.message }
  const target = findAddableTarget(reading.targets, input.targetId)
  if (target === null) return { kind: "unavailable", message: GONE_TARGET_MESSAGE }
  const updated = await context.repositoryStore.addTarget(repository.name, target)
  return updated === null ? null : { kind: "added", targetId: targetIdOf(target) }
}
