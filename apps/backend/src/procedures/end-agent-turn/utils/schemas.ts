import { z } from "zod"

export const stopHookInputSchema = z.looseObject({
  session_id: z.string().min(1),
  last_assistant_message: z.string().nullable().optional(),
})

export const stopHookOutputSchema = z.strictObject({
  decision: z.literal("block").optional(),
  reason: z.string().optional(),
})

export type StopHookInput = z.infer<typeof stopHookInputSchema>
export type StopHookOutput = z.infer<typeof stopHookOutputSchema>
