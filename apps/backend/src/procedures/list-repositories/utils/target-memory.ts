import { z } from "zod"
import type { BranchStatus, ReviewTarget } from "./repository"
import { branchTargetIdOf, pullRequestTargetIdOf } from "./target-id"

const JSON_INDENT = 2

export type AddedTarget
  = | { readonly kind: "branch", readonly name: string }
    | { readonly kind: "pull-request", readonly number: number, readonly author: string }

export interface TargetMemory {
  readonly baselineAt: Date
  readonly dismissedTargetIds: readonly string[]
  readonly addedTargets: readonly AddedTarget[]
}

export interface TargetFacts {
  readonly targetId: string
  readonly startedAt: Date
  readonly branchStatus: BranchStatus
}

const addedTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("branch"), name: z.string().min(1) }),
  z.strictObject({ kind: z.literal("pull-request"), number: z.number().int().positive(), author: z.string() }),
])

const targetMemorySchema = z.strictObject({
  baselineAt: z.iso.datetime(),
  dismissedTargetIds: z.array(z.string()),
  addedTargets: z.array(addedTargetSchema).default([]),
})

export const startTargetMemory = (baselineAt: Date): TargetMemory => ({ baselineAt, dismissedTargetIds: [], addedTargets: [] })

export const addedTargetIdOf = (target: AddedTarget): string =>
  target.kind === "branch" ? branchTargetIdOf(target.name) : pullRequestTargetIdOf(target.number)

export const toAddedTarget = (target: ReviewTarget): AddedTarget =>
  target.kind === "branch"
    ? { kind: "branch", name: target.name }
    : { kind: "pull-request", number: target.number, author: target.author }

export const isAddedTarget = (memory: TargetMemory, targetId: string): boolean =>
  memory.addedTargets.some((target) => addedTargetIdOf(target) === targetId)

export const addedBranchNamesOf = (memory: TargetMemory): readonly string[] =>
  memory.addedTargets.flatMap((target) => (target.kind === "branch" ? [target.name] : []))

export const addedPullRequestAuthorsOf = (memory: TargetMemory): readonly string[] => [
  ...new Set(memory.addedTargets.flatMap((target) => (target.kind === "pull-request" ? [target.author] : []))),
]

export const isNewTarget = (memory: TargetMemory, facts: TargetFacts): boolean =>
  facts.branchStatus === "no-review"
  && facts.startedAt.getTime() > memory.baselineAt.getTime()
  && !memory.dismissedTargetIds.includes(facts.targetId)
  && !isAddedTarget(memory, facts.targetId)

export const withDismissedTarget = (memory: TargetMemory, targetId: string): TargetMemory =>
  memory.dismissedTargetIds.includes(targetId)
    ? memory
    : { ...memory, dismissedTargetIds: [...memory.dismissedTargetIds, targetId] }

export const withAddedTarget = (memory: TargetMemory, target: AddedTarget): TargetMemory =>
  isAddedTarget(memory, addedTargetIdOf(target)) ? memory : { ...memory, addedTargets: [...memory.addedTargets, target] }

export const parseTargetMemory = (text: string): TargetMemory | null => {
  try {
    const memory = targetMemorySchema.safeParse(JSON.parse(text))
    return memory.success
      ? {
          baselineAt: new Date(memory.data.baselineAt),
          dismissedTargetIds: memory.data.dismissedTargetIds,
          addedTargets: memory.data.addedTargets,
        }
      : null
  } catch {
    return null
  }
}

export const formatTargetMemory = (memory: TargetMemory): string =>
  `${JSON.stringify(
    {
      baselineAt: memory.baselineAt.toISOString(),
      dismissedTargetIds: memory.dismissedTargetIds,
      addedTargets: memory.addedTargets,
    },
    null,
    JSON_INDENT,
  )}\n`
