import { z } from "zod"
import { AGENT_NAMES, SETUP_FORGES, SETUP_STEPS } from "@/procedures/get-setup/utils/setup"

export const repositoriesInputSchema = z.strictObject({ step: z.literal("repositories") })

export const agentsInputSchema = z.strictObject({
  step: z.literal("agents"),
  agents: z.array(
    z.strictObject({
      agent: z.enum(AGENT_NAMES),
      isPicked: z.boolean(),
      installPath: z.string(),
      model: z.string(),
      effort: z.string(),
    }),
  ),
  defaultAgent: z.enum(AGENT_NAMES).nullable(),
})

export const forgesInputSchema = z.strictObject({
  step: z.literal("forges"),
  forges: z.array(
    z.strictObject({
      forge: z.enum(SETUP_FORGES),
      isPicked: z.boolean(),
      username: z.string(),
      token: z.string(),
      baseUrl: z.string(),
    }),
  ),
  defaultForge: z.enum(SETUP_FORGES).nullable(),
})

export const configurationInputSchema = z.strictObject({
  step: z.literal("configuration"),
  configurationId: z.string(),
})

export const saveSetupStepInputSchema = z.discriminatedUnion("step", [
  repositoriesInputSchema,
  forgesInputSchema,
  agentsInputSchema,
  configurationInputSchema,
])

export const rejectedFieldSchema = z.strictObject({ owner: z.string(), name: z.string() })

export const stepSavingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("accepted"), nextStep: z.enum(SETUP_STEPS) }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), field: rejectedFieldSchema.nullable() }),
])

export type AgentsInput = z.infer<typeof agentsInputSchema>
export type ForgesInput = z.infer<typeof forgesInputSchema>
export type RejectedField = z.infer<typeof rejectedFieldSchema>
export type StepSaving = z.infer<typeof stepSavingSchema>
export type StepRejection = Extract<StepSaving, { kind: "rejected" }>
export type SaveSetupStepInput = z.infer<typeof saveSetupStepInputSchema>
