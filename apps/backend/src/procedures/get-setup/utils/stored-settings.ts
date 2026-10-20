import { z } from "zod"
import { STORED_CLASSIFICATION_NAMES, upgradedClassifications } from "@/procedures/get-review-preferences/utils/legacy-classifications"
import { reviewPreferencesSchema } from "@/procedures/get-review-preferences/utils/schemas"
import {
  AGENT_NAMES,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EMPTY_SETUP,
  SETUP_FORGES,
  type Setup,
} from "./setup"

const JSON_INDENT = 2
const RETIRED_AGENT_CONNECTIONS = ["direct", "manual"] as const

const authorSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  detail: z.string(),
  avatarUrl: z.string().nullable(),
})

const agentsChoiceSchema = z.strictObject({
  installs: z.array(
    z.strictObject({
      agent: z.enum(AGENT_NAMES),
      installPath: z.string(),
      model: z.string().default(DEFAULT_MODEL),
      effort: z.string().default(DEFAULT_EFFORT),
    }),
  ),
  defaultAgent: z.enum(AGENT_NAMES),
  connection: z.enum(RETIRED_AGENT_CONNECTIONS).optional(),
}).transform(({ installs, defaultAgent }) => ({ installs, defaultAgent }))

const forgesChoiceSchema = z.strictObject({
  connections: z.array(
    z.strictObject({
      forge: z.enum(SETUP_FORGES),
      username: z.string(),
      baseUrl: z.string(),
      hasCredential: z.boolean(),
    }),
  ),
  defaultForge: z.enum(SETUP_FORGES).optional(),
}).transform(({ connections }) => ({ connections }))

const setupSchema = z.strictObject({
  agents: agentsChoiceSchema.nullable(),
  forges: forgesChoiceSchema.nullable(),
  repositories: z.array(
    z.strictObject({
      name: z.string(),
      path: z.string(),
      selfAuthor: authorSchema.nullable(),
      trackedAuthors: z.array(authorSchema),
    }),
  ),
  isComplete: z.boolean(),
})

const storedReviewPreferencesSchema = reviewPreferencesSchema.extend({
  spotlight: z.array(z.enum(STORED_CLASSIFICATION_NAMES)).transform(upgradedClassifications),
})

const settingsSchema = z.strictObject({
  defaultConfiguration: z.string().nullable(),
  reviewPreferences: storedReviewPreferencesSchema.nullable().default(null),
  setup: setupSchema,
})

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const parseSettings = (text: string | null): Setup | null => {
  if (text === null) return EMPTY_SETUP
  const settings = settingsSchema.safeParse(parseJson(text))
  if (!settings.success) return null
  return {
    ...settings.data.setup,
    defaultConfiguration: settings.data.defaultConfiguration,
    reviewPreferences: settings.data.reviewPreferences,
  }
}

export const formatSettings = ({ defaultConfiguration, reviewPreferences, ...setup }: Setup): string =>
  `${JSON.stringify({ defaultConfiguration, reviewPreferences, setup }, null, JSON_INDENT)}\n`
