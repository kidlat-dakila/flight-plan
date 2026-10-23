import { z } from "zod"

export const getLiveAgentInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
})

const optionSchema = z.strictObject({ label: z.string(), description: z.string() })

export const launchAgentDialogSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  terminal: optionSchema.nullable(),
  manual: optionSchema.extend({ prompt: z.string(), copyLabel: z.string(), copiedMessage: z.string() }),
  closeLabel: z.string(),
})

export const liveAgentSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("live"),
    isOnline: z.boolean(),
    idleStoppedAt: z.iso.datetime().nullable(),
    statusLabel: z.string(),
    dialog: launchAgentDialogSchema,
  }),
  z.strictObject({ kind: z.literal("unavailable") }),
])

export type GetLiveAgentInput = z.infer<typeof getLiveAgentInputSchema>
export type LaunchAgentDialog = z.infer<typeof launchAgentDialogSchema>
export type LiveAgent = z.infer<typeof liveAgentSchema>
