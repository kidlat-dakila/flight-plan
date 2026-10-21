import { z } from "zod"
import { WALKTHROUGH_ORDERS, WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { presetOptionSchema } from "@/procedures/get-setup/utils/schemas"
import { AGENT_NAMES } from "@/procedures/get-setup/utils/setup"

export const getWriteUpPlanInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  sections: z.array(z.enum(WRITE_UP_SECTIONS)).nullable(),
})

export const writeUpSectionOptionSchema = z.strictObject({
  section: z.enum(WRITE_UP_SECTIONS),
  label: z.string(),
  count: z.number(),
  countLabel: z.string(),
  isChosen: z.boolean(),
})

export const writeUpPlanSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("plan"),
    isOffered: z.boolean(),
    agent: z.enum(AGENT_NAMES),
    agentLabel: z.string(),
    summary: z.array(z.strictObject({ label: z.string(), value: z.string() })),
    sections: z.array(writeUpSectionOptionSchema),
    totalLabel: z.string(),
    configurations: z.array(presetOptionSchema),
    configurationId: z.string(),
    walkthroughOrder: z.enum(WALKTHROUGH_ORDERS),
    isSegmented: z.boolean(),
  }),
  z.strictObject({ kind: z.literal("no-agent"), message: z.string() }),
])

export type GetWriteUpPlanInput = z.infer<typeof getWriteUpPlanInputSchema>
export type WriteUpSectionOption = z.infer<typeof writeUpSectionOptionSchema>
export type WriteUpPlan = z.infer<typeof writeUpPlanSchema>
