import type { ChatWriter } from "@/procedures/get-model-choice/utils/chat-writer"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { offeredEffortOf } from "@/procedures/get-setup/utils/agent-models"
import type { AgentName } from "@/procedures/get-setup/utils/setup"

export type ModelChoicePlan
  = | { readonly kind: "chosen", readonly agent: AgentName, readonly model: string, readonly effort: string }
    | { readonly kind: "rejected", readonly message: string }

const NO_AGENT_MESSAGE = "No agent that Flight Plan can start is set up. Finish the Agents step of the setup first."

export const planModelChoice = (chatWriter: ChatWriter | null, model: string): ModelChoicePlan => {
  if (chatWriter === null) return { kind: "rejected", message: NO_AGENT_MESSAGE }
  const { install, effort } = chatWriter.writer
  const offer = chatWriter.offers.find((candidate) => candidate.model === model)
  if (offer === undefined) {
    return { kind: "rejected", message: `${AGENT_LABELS[install.agent]} does not offer the model "${model}".` }
  }
  return { kind: "chosen", agent: install.agent, model, effort: offeredEffortOf(offer, effort) }
}
