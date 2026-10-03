import { z } from "zod"
import type { BranchStatus } from "./repository"

const JSON_INDENT = 2

export interface TargetMemory {
  readonly baselineAt: Date
  readonly dismissedTargetIds: readonly string[]
}

export interface TargetFacts {
  readonly targetId: string
  readonly startedAt: Date
  readonly branchStatus: BranchStatus
}

const targetMemorySchema = z.strictObject({
  baselineAt: z.iso.datetime(),
  dismissedTargetIds: z.array(z.string()),
})

export const startTargetMemory = (baselineAt: Date): TargetMemory => ({ baselineAt, dismissedTargetIds: [] })

export const isNewTarget = (memory: TargetMemory, facts: TargetFacts): boolean =>
  facts.branchStatus === "no-review"
  && facts.startedAt.getTime() > memory.baselineAt.getTime()
  && !memory.dismissedTargetIds.includes(facts.targetId)

export const withDismissedTarget = (memory: TargetMemory, targetId: string): TargetMemory =>
  memory.dismissedTargetIds.includes(targetId)
    ? memory
    : { ...memory, dismissedTargetIds: [...memory.dismissedTargetIds, targetId] }

export const parseTargetMemory = (text: string): TargetMemory | null => {
  try {
    const memory = targetMemorySchema.safeParse(JSON.parse(text))
    return memory.success
      ? { baselineAt: new Date(memory.data.baselineAt), dismissedTargetIds: memory.data.dismissedTargetIds }
      : null
  } catch {
    return null
  }
}

export const formatTargetMemory = (memory: TargetMemory): string =>
  `${JSON.stringify({ baselineAt: memory.baselineAt.toISOString(), dismissedTargetIds: memory.dismissedTargetIds }, null, JSON_INDENT)}\n`
