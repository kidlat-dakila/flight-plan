import { z } from "zod"
import { agentsStepSchema, forgesStepSchema, setupRepositorySchema } from "@/procedures/get-setup/utils/schemas"
import { SETTINGS_SECTIONS } from "./settings-section"

export const getSettingsInputSchema = z.strictObject({ section: z.enum(SETTINGS_SECTIONS) })

export const agentsSectionSchema = agentsStepSchema.omit({ step: true }).extend({ section: z.literal("agents") })

export const forgesSectionSchema = forgesStepSchema.omit({ step: true }).extend({ section: z.literal("forges") })

export const followedRepositorySchema = setupRepositorySchema.extend({
  configurationHref: z.string(),
  emptyMessage: z.string().nullable(),
})

export const repositoriesSectionSchema = z.strictObject({
  section: z.literal("repositories"),
  repositories: z.array(followedRepositorySchema),
})

export const settingsPageSchema = z.discriminatedUnion("section", [
  agentsSectionSchema,
  forgesSectionSchema,
  repositoriesSectionSchema,
])

export type GetSettingsInput = z.infer<typeof getSettingsInputSchema>
export type AgentsSection = z.infer<typeof agentsSectionSchema>
export type ForgesSection = z.infer<typeof forgesSectionSchema>
export type FollowedRepository = z.infer<typeof followedRepositorySchema>
export type RepositoriesSection = z.infer<typeof repositoriesSectionSchema>
export type SettingsPage = z.infer<typeof settingsPageSchema>
