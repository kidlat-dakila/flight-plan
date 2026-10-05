import { z } from "zod"
import type { ListedModel } from "./agent-models"

export const CLAUDE_MODEL_QUERY_ARGUMENTS = [
  "-p",
  "--input-format",
  "stream-json",
  "--output-format",
  "stream-json",
  "--verbose",
  "--setting-sources",
  "",
  "--no-session-persistence",
] as const

const LINE_BREAK = "\n"

export const CLAUDE_MODEL_QUERY = `${JSON.stringify({
  type: "control_request",
  request_id: "models",
  request: { subtype: "initialize" },
})}${LINE_BREAK}`

const reportedModelSchema = z.object({
  value: z.string(),
  displayName: z.string(),
  supportedEffortLevels: z.array(z.string()).optional(),
})

const modelReplySchema = z.object({
  type: z.literal("control_response"),
  response: z.object({ response: z.object({ models: z.array(reportedModelSchema) }) }),
})

type ReportedModel = z.infer<typeof reportedModelSchema>

const parseLine = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

const reportedModelsOf = (line: string): readonly ReportedModel[] => {
  const reply = modelReplySchema.safeParse(parseLine(line))
  return reply.success ? reply.data.response.response.models : []
}

const toListedModel = (reported: ReportedModel): ListedModel => ({
  model: reported.value,
  label: reported.displayName,
  efforts: reported.supportedEffortLevels ?? [],
})

export const parseClaudeModels = (output: string): readonly ListedModel[] =>
  output.split(LINE_BREAK).flatMap(reportedModelsOf).map(toListedModel)
