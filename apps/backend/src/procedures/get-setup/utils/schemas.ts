import { z } from "zod"
import { LINE_COLORS } from "@/procedures/list-repositories/utils/line-color"
import { labelSegmentSchema } from "@/procedures/list-repositories/utils/schemas"
import { FORGE_FIELD_NAMES } from "./forge-catalog"
import { AGENT_NAMES, SETUP_FORGES, SETUP_STEPS } from "./setup"

export const ROUTE_STOP_STATES = ["saved", "current", "upcoming"] as const

export const getSetupInputSchema = z.strictObject({ step: z.string().nullable() })

export const routeStopSchema = z.strictObject({
  step: z.enum(SETUP_STEPS),
  label: z.string(),
  state: z.enum(ROUTE_STOP_STATES),
  stateLabel: z.string(),
  isReachable: z.boolean(),
  lines: z.array(z.array(labelSegmentSchema)),
})

export const modelOptionSchema = z.strictObject({
  model: z.string(),
  label: z.string(),
  hasEffortChoice: z.boolean(),
  effortOptions: z.array(z.strictObject({ effort: z.string(), label: z.string() })),
  selectedEffort: z.string(),
})

export const agentOptionSchema = z.strictObject({
  agent: z.enum(AGENT_NAMES),
  label: z.string(),
  isPicked: z.boolean(),
  installPath: z.string(),
  pathHint: z.string(),
  unavailableReason: z.string().nullable(),
  model: z.string(),
  effort: z.string(),
  modelOptions: z.array(modelOptionSchema),
})

export const agentsStepSchema = z.strictObject({
  step: z.literal("agents"),
  agents: z.array(agentOptionSchema),
  defaultAgent: z.enum(AGENT_NAMES).nullable(),
})

export const forgeAvailabilitySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("available"), statusLabel: z.string().nullable() }),
  z.strictObject({ kind: z.literal("unavailable"), reason: z.string() }),
])

export const forgeFieldSchema = z.strictObject({
  name: z.enum(FORGE_FIELD_NAMES),
  label: z.string(),
  hint: z.string(),
  placeholder: z.string(),
  value: z.string(),
  isSecret: z.boolean(),
})

export const forgeOptionSchema = z.strictObject({
  forge: z.enum(SETUP_FORGES),
  label: z.string(),
  description: z.string(),
  isPicked: z.boolean(),
  isRequired: z.boolean(),
  availability: forgeAvailabilitySchema,
  fields: z.array(forgeFieldSchema),
  limitation: z.strictObject({ label: z.string(), items: z.array(z.string()) }).nullable(),
})

export const forgesStepSchema = z.strictObject({
  step: z.literal("forges"),
  forges: z.array(forgeOptionSchema),
  defaultForge: z.enum(SETUP_FORGES),
})

export const presetOptionSchema = z.strictObject({
  configurationId: z.string(),
  label: z.string(),
  bestFor: z.string(),
  description: z.string(),
  note: z.string().nullable(),
})

export const configurationStepSchema = z.strictObject({
  step: z.literal("configuration"),
  presets: z.array(presetOptionSchema),
  selectedConfigurationId: z.string(),
})

export const trackedAuthorSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  detail: z.string(),
  avatarUrl: z.string().nullable(),
  monogram: z.string(),
})

export const setupRepositorySchema = z.strictObject({
  name: z.string(),
  path: z.string(),
  lineColor: z.enum(LINE_COLORS),
  lineLabel: z.string(),
  authorSearchHint: z.string(),
  authorSearchPlaceholder: z.string(),
  selfAuthor: z
    .strictObject({
      hint: z.string(),
      author: trackedAuthorSchema.nullable(),
      stateLabel: z.string(),
      isChangeable: z.boolean(),
    })
    .nullable(),
  trackedAuthors: z.array(trackedAuthorSchema),
})

export const repositoriesStepSchema = z.strictObject({
  step: z.literal("repositories"),
  repositories: z.array(setupRepositorySchema),
  isReadyToContinue: z.boolean(),
  continueHint: z.string().nullable(),
})

export const setupStepSchema = z.discriminatedUnion("step", [
  agentsStepSchema,
  forgesStepSchema,
  configurationStepSchema,
  repositoriesStepSchema,
])

export const setupPageSchema = z.strictObject({
  progressLabel: z.string(),
  route: z.array(routeStopSchema),
  backStep: z.enum(SETUP_STEPS).nullable(),
  form: setupStepSchema,
})

export type GetSetupInput = z.infer<typeof getSetupInputSchema>
export type RouteStop = z.infer<typeof routeStopSchema>
export type AgentsStep = z.infer<typeof agentsStepSchema>
export type ForgeField = z.infer<typeof forgeFieldSchema>
export type ForgeOption = z.infer<typeof forgeOptionSchema>
export type ForgesStep = z.infer<typeof forgesStepSchema>
export type ConfigurationStep = z.infer<typeof configurationStepSchema>
export type TrackedAuthor = z.infer<typeof trackedAuthorSchema>
export type RepositoriesStep = z.infer<typeof repositoriesStepSchema>
export type SetupStepForm = z.infer<typeof setupStepSchema>
export type SetupPage = z.infer<typeof setupPageSchema>
