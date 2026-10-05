import type { Question } from "@/procedures/get-conversation/utils/conversation"

export const ALLOW_LABEL = "Allow"
export const DENY_LABEL = "Deny"

const MAX_DETAIL_LENGTH = 4_000
const JSON_INDENT = 2
const DETAIL_FIELDS = ["command", "file_path", "url", "pattern", "path"] as const

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const leadingField = (toolInput: unknown): string | null => {
  if (!isRecord(toolInput)) return null
  const field = DETAIL_FIELDS.map((name) => toolInput[name]).find((value) => typeof value === "string")
  return typeof field === "string" ? field : null
}

export const describeToolInput = (toolInput: unknown): string | null => {
  const detail = leadingField(toolInput) ?? JSON.stringify(toolInput ?? null, null, JSON_INDENT)
  return detail === "null" || detail === "{}" ? null : detail.slice(0, MAX_DETAIL_LENGTH)
}

export const permissionQuestionOf = (questionId: string, toolName: string, toolInput: unknown): Question => ({
  id: questionId,
  prompt: `Allow the agent to use ${toolName}?`,
  detail: describeToolInput(toolInput),
  options: [
    { label: ALLOW_LABEL, description: "Let the agent run it this time." },
    { label: DENY_LABEL, description: "Refuse, and tell the agent why if you write an answer." },
  ],
  allowsMultiple: false,
})
