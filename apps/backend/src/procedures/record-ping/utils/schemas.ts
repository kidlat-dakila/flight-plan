import { z } from "zod"

export const recordPingInputShape = {
  repositoryName: z.string().min(1).describe("The repository's name in Flight Plan."),
  targetId: z.string().min(1).describe("pr-<number> for a pull request, branch-<name> for a branch."),
}

export const recordPingInputSchema = z.strictObject(recordPingInputShape)

export type RecordPingInput = z.infer<typeof recordPingInputSchema>

export type PingRecording
  = | { readonly kind: "recorded", readonly note: string }
    | { readonly kind: "rejected", readonly message: string }
