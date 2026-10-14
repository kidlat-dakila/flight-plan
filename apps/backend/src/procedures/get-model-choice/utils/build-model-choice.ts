import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { ChatWriter } from "./chat-writer"
import type { ModelChoiceView } from "./schemas"

const MINIMUM_OFFER_COUNT = 2
const NEXT_TURN_HINT = "The agent uses it from its next turn."

export const buildModelChoice = (chatWriter: ChatWriter | null): ModelChoiceView | null => {
  if (chatWriter === null || chatWriter.offers.length < MINIMUM_OFFER_COUNT) return null
  const { install } = chatWriter.writer
  return {
    label: `Model for ${AGENT_LABELS[install.agent]}`,
    hint: NEXT_TURN_HINT,
    selectedModel: install.model,
    options: chatWriter.offers.map(({ model, label }) => ({ value: model, label })),
  }
}
