import { z } from "zod"
import {
  AGENT_CONNECTIONS,
  AGENT_NAMES,
  EMPTY_SETUP,
  PRESET_NAMES,
  SETUP_FORGES,
  type Setup,
} from "./setup"

const JSON_INDENT = 2

const authorSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  detail: z.string(),
  avatarUrl: z.string().nullable(),
})

const agentsChoiceSchema = z.strictObject({
  installs: z.array(z.strictObject({ agent: z.enum(AGENT_NAMES), installPath: z.string() })),
  defaultAgent: z.enum(AGENT_NAMES),
  connection: z.enum(AGENT_CONNECTIONS),
})

const forgesChoiceSchema = z.strictObject({
  connections: z.array(
    z.strictObject({
      forge: z.enum(SETUP_FORGES),
      username: z.string(),
      baseUrl: z.string(),
      hasCredential: z.boolean(),
    }),
  ),
  defaultForge: z.enum(SETUP_FORGES),
})

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

const settingsSchema = z.strictObject({
  defaultConfiguration: z.enum(PRESET_NAMES).nullable(),
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
  return { ...settings.data.setup, preset: settings.data.defaultConfiguration }
}

export const formatSettings = ({ preset, ...setup }: Setup): string =>
  `${JSON.stringify({ defaultConfiguration: preset, setup }, null, JSON_INDENT)}\n`
